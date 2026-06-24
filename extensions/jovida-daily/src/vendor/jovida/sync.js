"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncClient = void 0;
// 同步原语:在线读改写(put/get snapshot + OCC)。CLI storeless,无本地库/对账。
// 请求形与后端一致:PUT={ dataset:{entries,recurrings}, baseServerVersion };GET={ expectedServerVersion, pageToken, snapshotToken };均 proto3-JSON。
const api_1 = require("./api");
const state_1 = require("./state");
const proto_1 = require("./core/proto");
const PUT = '/jov/todo/v1/put_todo_snapshot';
const GET = '/jov/todo/v1/get_todo_snapshot';
const DELETE = '/jov/todo/v1/delete_todo_objects';
const MAX_CONFLICT = 3; // put 409(落后)→pull→重试
const MAX_EXPIRED = 3; // get 409(分页快照过期)→首页重拉
class SyncClient {
    api;
    constructor(api) {
        this.api = api;
    }
    /** 全量拉取(CLI storeless:每次强制全量,expectedServerVersion=0)。处理分页 + 409 SNAPSHOT_EXPIRED 重拉。 */
    async pull() {
        for (let attempt = 0; attempt < MAX_EXPIRED; attempt++) {
            const r = await this.pullOnce();
            if (r) {
                (0, state_1.setLastServerVersion)(r.serverVersion);
                return r;
            }
        }
        throw new Error('snapshot kept expiring during pagination');
    }
    async pullOnce() {
        const entries = [];
        const recurrings = [];
        let pageToken = '';
        let snapshotToken = '';
        let serverVersion = 0;
        for (;;) {
            let resp;
            try {
                resp = await this.api.post(GET, {
                    expectedServerVersion: '0', // 强制全量(storeless 无本地副本可省传)
                    pageToken,
                    snapshotToken
                });
            }
            catch (e) {
                if (e instanceof api_1.ApiError && e.status === 409)
                    return null; // SNAPSHOT_EXPIRED → 外层重拉
                throw e;
            }
            serverVersion = resp.serverVersion != null ? Number(resp.serverVersion) : serverVersion;
            if (!snapshotToken && resp.snapshotToken)
                snapshotToken = resp.snapshotToken;
            for (const o of resp.objects ?? []) {
                if (o.entry)
                    entries.push((0, proto_1.entryFromProto)(o.entry));
                else if (o.recurring)
                    recurrings.push((0, proto_1.recurringFromProto)(o.recurring));
            }
            if (!resp.hasMore || !resp.nextPageToken)
                break;
            pageToken = resp.nextPageToken;
        }
        return { entries, recurrings, serverVersion };
    }
    /** 增量 upsert entries。409 SYNC_CONFLICT → pull 追平版本 → 重试。 */
    async putEntries(items) {
        for (let attempt = 0; attempt <= MAX_CONFLICT; attempt++) {
            try {
                await this.api.post(PUT, {
                    dataset: { entries: items.map(proto_1.entryToProto), recurrings: [] },
                    baseServerVersion: String((0, state_1.getLastServerVersion)())
                });
                return;
            }
            catch (e) {
                if (e instanceof api_1.ApiError && e.status === 409 && attempt < MAX_CONFLICT) {
                    await this.pull(); // 追平 lastServerVersion 后重试
                    continue;
                }
                throw e;
            }
        }
    }
    /** 增量 upsert 循环「类」(recurrings)。409 SYNC_CONFLICT → pull 追平 → 重试。 */
    async putRecurrings(items) {
        for (let attempt = 0; attempt <= MAX_CONFLICT; attempt++) {
            try {
                await this.api.post(PUT, {
                    dataset: { entries: [], recurrings: items.map(proto_1.recurringToProto) },
                    baseServerVersion: String((0, state_1.getLastServerVersion)())
                });
                return;
            }
            catch (e) {
                if (e instanceof api_1.ApiError && e.status === 409 && attempt < MAX_CONFLICT) {
                    await this.pull();
                    continue;
                }
                throw e;
            }
        }
    }
    /** 逐条硬删(无 OCC 门控;对未知 id 幂等)。 */
    async deleteObjects(ids) {
        for (const objectId of ids)
            await this.api.post(DELETE, { objectId });
    }
}
exports.SyncClient = SyncClient;
