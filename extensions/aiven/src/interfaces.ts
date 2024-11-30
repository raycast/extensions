interface Project {
    project_name: string;
    tags: {
        [key: string]: string;
    }
}
export interface ListProjectsResult {
    projects: Project[];
}

export enum State {
    POWEROFF="POWEROFF",
    REBALANCING="REBALANCING",
    REBUILDING="REBUILDING",
    RUNNING="RUNNING",
}
interface Service {
    create_time: string;
    node_count: number;
    service_name: string;
    service_type: string;
    state: State;
}
export interface ListServicesResult {
    services: Service[];
}

export interface ErrorResult {
    message: string;
    errors?: Array<{
        message: string;
        status: number;
    }>;
}