export type Database = {
        "id":string
        "name":string
        "display_name":string

}
export type StaticSite = {
    "id":string
    "name":string
    "display_name":string
    "status": "deploymentInProgress" | "deploymentSuccess" | "deploymentFailed" | "deploymentCancelled" | "deleting" | "deletionFailed"
}