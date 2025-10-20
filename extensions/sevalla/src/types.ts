export type Database = {
        "id":string
        "name":string
        "display_name":string
                  
          "status": string
          "updated_at": number
          "type": "postgresql" | "mysql" | "mariadb"|
          "redis"|"valkey"
          "version": string
          "resource_type_name": string

}
export type StaticSite = {
    "id":string
    "name":string
    "display_name":string
    "status": "deploymentInProgress" | "deploymentSuccess" | "deploymentFailed" | "deploymentCancelled" | "deleting" | "deletionFailed"
}