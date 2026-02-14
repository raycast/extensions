/** npm search 接口入参 */
export interface NPMSearchParams {
    /** 搜索关键词（必填） */
    text: string;
    /** 返回条数（分页大小） */
    size?: number;
    /** 偏移量（分页起始） */
    from?: number;
    /** 最低质量分（0 ~ 1） */
    quality?: number;
    /** 最低流行度分（0 ~ 1） */
    popularity?: number;
    /** 最低维护度分（0 ~ 1） */
    maintenance?: number;
}

export interface NPMPackage {
    name: string;
    sanitized_name: string;
    version: string;
    description: string;
    keywords?: string[];
    publisher: NpmUser;
    maintainers: NpmUser[];
    license: string;
    /** 包首次发布时间 */
    date: string;
    links: {
        homepage?: string;
        npm: string;
        repository?: string;
        bugs?: string;
    };
}

export interface NPMUser {
    username: string;
    email?: string;
}

export interface NPMSearchObject {
    downloads: {
        monthly: number;
        weekly: number;
    };
    dependents: number;
    /** 最近更新时间 */
    updated: string;
    /** 搜索排序用分数 */
    searchScore: number;
    package: NPMPackage;
    score: {
        final: number;
        detail: {
            popularity: number;
            quality: number;
            maintenance: number;
        };
    };
    flags: {
        insecure: number; // 0 | 1
    };
}

/** npm search 接口返回结构 */
export interface NPMSearchResponse {
    objects: NPMSearchObject[];
    total: number;
    time: string; // ISO 时间字符串
}
