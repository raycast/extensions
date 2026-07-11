"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = exports.ApiError = void 0;
// Jovida 后端 HTTP 客户端（node）。
// body = proto3-JSON（camelCase）；鉴权 = Sign 态 vita token 走 `Vita-Token` header。
// 设备授权流的 device_authorize/device_token 是匿名端点（登录时尚无 token，不带 Vita-Token）。
const node_os_1 = require("node:os");
const config_1 = require("./config");
class ApiError extends Error {
    status;
    reason;
    constructor(status, reason, message) {
        super(message);
        this.status = status;
        this.reason = reason;
        this.name = 'ApiError';
    }
}
exports.ApiError = ApiError;
class ApiClient {
    cfg;
    token = ''; // Sign 态 vita token（Vita-Token）
    constructor(cfg) {
        this.cfg = cfg;
    }
    setToken(token) {
        this.token = token;
    }
    async post(path, body = {}) {
        return this.fetchJson(path, 'POST', body);
    }
    async get(path) {
        return this.fetchJson(path, 'GET');
    }
    headers() {
        const utcOffsetSec = -new Date().getTimezoneOffset() * 60;
        const h = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Vita-Aid': this.cfg.appId,
            'Vita-Did': this.cfg.deviceId,
            'Vita-Platform': this.cfg.platform,
            'Vita-App-Version': config_1.APP_VERSION,
            'Vita-Os-Name': process.platform,
            'Vita-Os-Version': (0, node_os_1.release)(),
            'Vita-Time-Zone': Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
            'Vita-UTC-Offset': String(utcOffsetSec),
            'Vita-Language': 'en'
        };
        if (this.token)
            h['Vita-Token'] = this.token;
        return h;
    }
    async fetchJson(path, method, body) {
        let res;
        try {
            res = await fetch(`${this.cfg.baseUrl}${path}`, {
                method,
                headers: this.headers(),
                body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
                signal: this.cfg.timeoutMs && this.cfg.timeoutMs > 0 ? AbortSignal.timeout(this.cfg.timeoutMs) : undefined
            });
        }
        catch (e) {
            // fetch 本身抛错(DNS/连接拒绝/超时)→ 网络故障,归 ApiError(status 0) → exit 3,
            // 别落到通用 exit 1(usage),否则 agent 会误判为命令写错而乱改重试。
            const msg = e instanceof Error ? e.message : String(e);
            throw new ApiError(0, 'NETWORK', `network error reaching ${path}: ${msg}`);
        }
        if (!res.ok) {
            let reason = '';
            try {
                reason = JSON.parse(await res.text()).reason ?? '';
            }
            catch {
                /* 非 JSON 错误体 */
            }
            throw new ApiError(res.status, reason, `HTTP ${res.status} on ${path}${reason ? ` (${reason})` : ''}`);
        }
        return (await res.json());
    }
}
exports.ApiClient = ApiClient;
