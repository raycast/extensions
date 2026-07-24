"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncClient = void 0;
// 同步原语:在线读改写(put/get snapshot + OCC)。CLI storeless,无本地库/对账。
// 走后端 v2 统一对象接口:数据装在 TodoItemDataset.items(以 itemType 判别 entry/recurring)。
// 请求形与后端一致:PUT={ dataset:{items}, baseServerVersion };GET={ expectedServerVersion, pageToken, snapshotToken };均 proto3-JSON。
const api_1 = require("./api");
const state_1 = require("./state");
const proto_1 = require("./core/proto");
const PUT = '/jov/todo/v2/put_todo_snapshot';
const GET = '/jov/todo/v2/get_todo_snapshot';
const DELETE = '/jov/todo/v2/delete_todo_item';
const VERSION = '/jov/todo/v2/get_todo_version';
const MAX_CONFLICT = 3; // put 409(落后)→pull→重试
const MAX_EXPIRED = 3; // get 409(分页快照过期)→首页重拉
class SyncClient {
    api;
    constructor(api) {
        this.api = api;
    }
    /** 轻量版本探测(get_todo_version):只回一个版本号。给 `due` 的过期缓存续期用,免掉无谓的全量拉取。 */
    async getServerVersion() {
        const r = await this.api.post(VERSION, {});
        return r.serverVersion != null ? Number(r.serverVersion) : 0;
    }
    /** 全量拉取(CLI storeless:每次强制全量,expectedServerVersion=0)。处理分页 + 409 SNAPSHOT_EXPIRED 重拉。 */
    async pull() {
        for (let attempt = 0; attempt < MAX_EXPIRED; attempt++) {
            const r = await this.pullOnce();
            if (r) {
                (0, state_1.setLastServerVersion)(r.serverVersion);
                (0, state_1.writeSnapshotCache)(r); // 任何全量 pull 都顺手刷新 `jovida due` 的缓存
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
            for (const o of resp.dataset?.items ?? []) {
                if ((0, proto_1.itemIsRecurringRule)(o))
                    recurrings.push((0, proto_1.itemToRecurring)(o));
                else
                    entries.push((0, proto_1.itemToEntry)(o)); // 单态 + 发生态都映回 TodoEntry
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
                    dataset: { items: items.map(proto_1.entryToItem) },
                    baseServerVersion: String((0, state_1.getLastServerVersion)())
                });
                (0, state_1.invalidateSnapshotCache)(); // 写成功 → 缓存过时
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
                    dataset: { items: items.map(proto_1.recurringToItem) },
                    baseServerVersion: String((0, state_1.getLastServerVersion)())
                });
                (0, state_1.invalidateSnapshotCache)();
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
    // 逐条删除(无 OCC 门控;对未知 id 幂等)。服务端为全局软删(写 deleted_at),但对客户端透明:
    // 快照过滤掉已删行,删除契约仍是「快照中缺失 ⇒ 已删」;同 id 再 put 会就地复活(覆盖、清 deleted_at)。
    async deleteObjects(ids) {
        for (const itemId of ids)
            await this.api.post(DELETE, { itemId });
        if (ids.length)
            (0, state_1.invalidateSnapshotCache)();
    }
}
exports.SyncClient = SyncClient;
