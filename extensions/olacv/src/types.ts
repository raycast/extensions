export type Contact = {
    id: string;
    name: string;
    email: string;
    phone: string;
    fax: string | null;
    organization: string;
    address: string;
    city: string;
    state: string | null;
    postcode: string;
    country: string;
    password: string | null;
    created_at: string;
    updated_at: string;
}

export type Domain = {
    id: string;
    domain: string;
    auto_renew: boolean;
    registered_at: string;
    expires_at: string;
    created_at: string;
    updated_at: string;
}

export type  ErrorResult = {
    message: string;
    errors?: {
        [item: string]: string[];
    }
}
export type Result<T> = {
    data: T;
    message: string;
}