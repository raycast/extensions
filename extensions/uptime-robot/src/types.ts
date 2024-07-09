export type NewMonitor = {
    friendly_name: string;
    url: string;
    type: string;
    interval: string;
    timeout: string;
}

export type SuccessResponse<T> = {
    stat: "ok";
} & T;

export type ErrorResponse = {
    stat: "fail";
    error: {
        type: string;
        parameter_name: string;
        passed_value: string;
        message: string;
    }
}