export interface ToggleFilterResponse {
    body: Body;
    success: boolean;
}
interface Body {
    filters: string[];
}
