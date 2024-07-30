export type Server = {
    id: number;
    uuid: string;
    name: string;
    description: string;
    ip: string;
    user: string;
    port: number;
    // proxy: {};
    high_disk_usage_notification_sent: true,
    unreachable_notification_sent: true,
    unreachable_count: number;
    validation_logs: string;
    log_drain_notification_sent: true,
    swarm_cluster: string;
}
export type CreateServer = {
    name: string;
    description: string;
    ip: string;
    port: string;
    user: string;
    private_key_uuid: string;
    is_build_server: boolean;
    instant_validate: boolean;
}

export type PrivateKey = {
    id: number;
    uuid: string;
    name: string;
    description: string;
    private_key: string;
    is_git_related: true,
    team_id: number;
    created_at: string;
    updated_at: string;
}