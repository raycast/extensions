export type Server = {
    uuid: string;
    description: string | null;
    name: string;
    ip: string;
    is_reachable: boolean;
    is_usable: boolean;
    user: string;
    port: number;
    settings: Record<string, string | number | boolean | null>;
}
export type ServerDetails = {
    uuid: string;
    description: string;
    name: string;
    high_disk_usage_notification_sent: boolean;
    ip: string;
    log_drain_notification_sent: boolean;
    port: number;
    private_key_id: number;
    proxy: {
      type: string;
      status: string;
    }
    settings: Record<string, string | number | boolean | null>;
    // "swarm_cluster": null,
    team_id: number;
    unreachable_count: number;
    unreachable_notification_sent: boolean;
    user: string;
    // validation_logs: null,
    created_at: string;
    updated_at: string;
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

export type Resource = {
    id: number;
    uuid: string;
    name: string;
    type: string;
    created_at: string;
    updated_at: string;
    status: string;
}
export type ResourceDetails = {
    id: number;
    uuid: string;
    name: string;
    status: string;
} & ({
    type: "application";
    destination: {
        id: number;
        name: string;
        uuid: string;
        network: string;
        server_id: number;
        created_at: string;
        updated_at: string;
        server: ServerDetails;
    }
} | {
    type: "service";
    server: ServerDetails;
})

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