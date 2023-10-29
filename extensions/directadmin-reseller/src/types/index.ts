type ListResponse = {
    list: string[];
}

// 
export type GetUserUsageResponse = {
    bandwidth: string;
    db_quota: string;
    quota: string;
    domainptr: string;
    email_deliveries: string;
    email_deliveries_incoming: string;
    email_deliveries_outgoing: string;
    email_quota: string;
    ftp: string;
    inode: string;
    mysql: string;
    nemailf: string;
    nemailml: string;
    nemailr: string;
    nemails: string;
    nsubdomains: string;
    other_quota: string;
    quota_without_system: string;
    vdomains: string;
}
export type GetUserConfigResponse = {
    account: string;
    additional_bandwidth: string;
    aftp: string;
    api_with_password: string;
    bandwidth: string;
    catchall: string;
    cgi: string;
    clamav: string;
    creator: string;
    cron: string;
    date_created: string;
    demo: string;
    dnscontrol: string;
    docsroot: string;
    domain: string;
    domainptr: string;
    email: string;
    email_limit: string;
    ftp: string;
    git: string;
    inode: string;
    ip: string;
    ips: string;
    language: string;
    login_keys: string;
    mysql: string;
    name: string;
    nemailf: string;
    nemailml: string;
    nemailr: string;
    nemails: string;
    notify_on_all_question_failures: string;
    notify_on_all_twostep_auth_failures: string;
    ns1: string;
    ns2: string;
    nsubdomains: string;
    original_package: string;
    package: string;
    php: string;
    quota: string;
    security_questions: string;
    skin: string;
    spam: string;
    ssh: string;
    ssl: string;
    suspend_at_limit: string;
    suspended: string;
    sysinfo: string;
    twostep_auth: string;
    user_widgets: string;
    username: string;
    usertype: string;
    vdomains: string;
    wordpress: string;
    zoom: string;
}
export type GetUserDomainsResponse = {
    [key: string]: {
        bandwidth_used: string;
        bandwidth_limit: string;
        disk_usage: string;
        log_usage: string;
        subdomains: string;
        suspended: string;
        quote: string;
        ssl: string;
        cgi: string;
        php: string;
    };
}

// 
export type GetResellerIPsResponse = ListResponse;
export type GetResellerIPInformationResponse = {
    gateway: string;
    global: "yes" | "no";
    netmask: string;
    ns: string;
    reseller: string;
    status: string;
    value: string;
}

export type GetResellerUserAccountsResponse = ListResponse;

// export type SuccessResponse = GetResellerIPResponse | GetResellerIPsResponse;
export type ErrorResponse = {
    error: "1";
    text: string;
    details: string;
}