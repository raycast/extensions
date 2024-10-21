export type Paste = {
    duration: number;
    id: string;
    language: string;
    title: string;
    url: string;
}
export type ActionResult = {
    result: "success"
} | {
    result: "error";
    error_msg: string;
}