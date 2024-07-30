export type GetOrganizationsResponse = {
    organizations: {
        edges: Array<{
            node: {
                name: string;
                slug: string;
                id: string;
            }
        }>
    }
}

export type GetServicesResponse = {
    organization: {
        services: {
            edges: Array<{
                node: {
                    cdnEndpoint: string;
                    name: string;
                }
            }>
        }
    }
}


export type SuccessResponse<T> = {
    data: T;
}
export type ErrorResponse = {
    errors: Array<{
        message: string;
        extensions: {
            code: string;
        } | 
            {[key: string]: {
                code: string;
                detais?: unknown;
            }}
    }>
}