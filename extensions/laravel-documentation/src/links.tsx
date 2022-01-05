const LARAVEL_OFFICIAL = "https://laravel.com/docs/8.x/"

const documentation = {
    "Prologue": [
        { "url": LARAVEL_OFFICIAL + "installation", "title": "Installation" },
        { "url": LARAVEL_OFFICIAL + "configuration", "title": "Configuration" },
        { "url": LARAVEL_OFFICIAL + "structure", "title": "Directory Structure" },
        { "url": LARAVEL_OFFICIAL + "starter-kits", "title": "Starter Kits" },
        { "url": LARAVEL_OFFICIAL + "deployment", "title": "Deployment" },
    ],
    "Getting Started": [
        {
            "url": LARAVEL_OFFICIAL + "installation",
            "title": "Installation"
        },
        {
            "url": LARAVEL_OFFICIAL + "configuration",
            "title": "Configuration"
        },
        {
            "url": LARAVEL_OFFICIAL + "structure",
            "title": "Directory Structure"
        },
        {
            "url": LARAVEL_OFFICIAL + "starter-kits",
            "title": "Starter Kits"
        },
        {
            "url": LARAVEL_OFFICIAL + "deployment",
            "title": "Deployment"
        },
    ],
    "Architecture Concepts": [
        { "url": LARAVEL_OFFICIAL + "lifecycle", "title": "Request Lifecycle" },
        { "url": LARAVEL_OFFICIAL + "container", "title": "Service Container" },
        { "url": LARAVEL_OFFICIAL + "providers", "title": "Service Providers" },
        { "url": LARAVEL_OFFICIAL + "facades", "title": "Facades" },
    ],
    "The Basics": [
        { "url": LARAVEL_OFFICIAL + "routing", "title": "Routing" },
        { "url": LARAVEL_OFFICIAL + "middleware", "title": "Middleware" },
        { "url": LARAVEL_OFFICIAL + "csrf", "title": "CSRF Protection" },
        { "url": LARAVEL_OFFICIAL + "controllers", "title": "Controllers" },
        { "url": LARAVEL_OFFICIAL + "requests", "title": "Requests" },
        { "url": LARAVEL_OFFICIAL + "responses", "title": "Responses" },
        { "url": LARAVEL_OFFICIAL + "views", "title": "Views" },
        { "url": LARAVEL_OFFICIAL + "blade", "title": "Blade Templates" },
        { "url": LARAVEL_OFFICIAL + "urls", "title": "URL Generation" },
        { "url": LARAVEL_OFFICIAL + "session", "title": "Session" },
        { "url": LARAVEL_OFFICIAL + "validation", "title": "Validation" },
        { "url": LARAVEL_OFFICIAL + "errors", "title": "Error Handling" },
        { "url": LARAVEL_OFFICIAL + "logging", "title": "Logging" },
    ],
    "Digging Deeper": [
        { "url": LARAVEL_OFFICIAL + "artisan", "title": "Artisan Console" },
        { "url": LARAVEL_OFFICIAL + "broadcasting", "title": "Broadcasting" },
        { "url": LARAVEL_OFFICIAL + "cache", "title": "Cache" },
        { "url": LARAVEL_OFFICIAL + "collections", "title": "Collections" },
        { "url": LARAVEL_OFFICIAL + "mix", "title": "Compiling Assets" },
        { "url": LARAVEL_OFFICIAL + "contracts", "title": "Contracts" },
        { "url": LARAVEL_OFFICIAL + "events", "title": "Events" },
        { "url": LARAVEL_OFFICIAL + "filesystem", "title": "File Storage" },
        { "url": LARAVEL_OFFICIAL + "helpers", "title": "Helpers" },
        { "url": LARAVEL_OFFICIAL + "http-client", "title": "HTTP Client" },
        { "url": LARAVEL_OFFICIAL + "localization", "title": "Localization" },
        { "url": LARAVEL_OFFICIAL + "mail", "title": "Mail" },
        { "url": LARAVEL_OFFICIAL + "notifications", "title": "Notifications" },
        { "url": LARAVEL_OFFICIAL + "packages", "title": "Package Development" },
        { "url": LARAVEL_OFFICIAL + "queues", "title": "Queues" },
        { "url": LARAVEL_OFFICIAL + "rate-limiting", "title": "Rate Limiting" },
        { "url": LARAVEL_OFFICIAL + "scheduling", "title": "Task Scheduling" },
    ],
    "Security": [
        { "url": LARAVEL_OFFICIAL + "authentication", "title": "Authentication" },
        { "url": LARAVEL_OFFICIAL + "authorization", "title": "Authorization" },
        { "url": LARAVEL_OFFICIAL + "verification", "title": "Email Verification" },
        { "url": LARAVEL_OFFICIAL + "encryption", "title": "Encryption" },
        { "url": LARAVEL_OFFICIAL + "hashing", "title": "Hashing" },
        { "url": LARAVEL_OFFICIAL + "passwords", "title": "Password Reset" },
    ],
    "Database": [
        { "url": LARAVEL_OFFICIAL + "database", "title": "Getting Started" },
        { "url": LARAVEL_OFFICIAL + "queries", "title": "Query Builder" },
        { "url": LARAVEL_OFFICIAL + "pagination", "title": "Pagination" },
        { "url": LARAVEL_OFFICIAL + "migrations", "title": "Migrations" },
        { "url": LARAVEL_OFFICIAL + "seeding", "title": "Seeding" },
        { "url": LARAVEL_OFFICIAL + "redis", "title": "Redis" },
    ],
    "Eloquent ORM": [
        { "url": LARAVEL_OFFICIAL + "eloquent", "title": "Getting Started" },
        { "url": LARAVEL_OFFICIAL + "eloquent-relationships", "title": "Relationships" },
        { "url": LARAVEL_OFFICIAL + "eloquent-collections", "title": "Collections" },
        { "url": LARAVEL_OFFICIAL + "eloquent-mutators", "title": "Mutators / Casts" },
        { "url": LARAVEL_OFFICIAL + "eloquent-resources", "title": "API Resources" },
        { "url": LARAVEL_OFFICIAL + "eloquent-serialization", "title": "Serialization" },
    ],
    "Testing": [
        { "url": LARAVEL_OFFICIAL + "testing", "title": "Getting Started" },
        { "url": LARAVEL_OFFICIAL + "http-tests", "title": "HTTP Tests" },
        { "url": LARAVEL_OFFICIAL + "console-tests", "title": "Console Tests" },
        { "url": LARAVEL_OFFICIAL + "dusk", "title": "Browser Tests" },
        { "url": LARAVEL_OFFICIAL + "database-testing", "title": "Database" },
        { "url": LARAVEL_OFFICIAL + "mocking", "title": "Mocking" },
    ],
    "Packages": [
        { "url": LARAVEL_OFFICIAL + "starter-kits#laravel-breeze", "title": "Breeze" },
        { "url": LARAVEL_OFFICIAL + "billing", "title": "Cashier (Stripe)" },
        { "url": LARAVEL_OFFICIAL + "cashier-paddle", "title": "Cashier (Paddle" },
        { "url": LARAVEL_OFFICIAL + "dusk", "title": "Dusk" },
        { "url": LARAVEL_OFFICIAL + "envoy", "title": "Envoy" },
        { "url": LARAVEL_OFFICIAL + "fortify", "title": "Fortify" },
        { "url": LARAVEL_OFFICIAL + "homestead", "title": "Homestead" },
        { "url": LARAVEL_OFFICIAL + "horizon", "title": "Horizon" },
        { "url": "https://jetstream.laravel.com", "title": "Jetstream" },
        { "url": LARAVEL_OFFICIAL + "octane", "title": "Octane" },
        { "url": LARAVEL_OFFICIAL + "passport", "title": "Passport" },
        { "url": LARAVEL_OFFICIAL + "sail", "title": "Sail" },
        { "url": LARAVEL_OFFICIAL + "sanctum", "title": "Sanctum" },
        { "url": LARAVEL_OFFICIAL + "scout", "title": "Scout" },
        { "url": LARAVEL_OFFICIAL + "socialite", "title": "Socialite" },
        { "url": LARAVEL_OFFICIAL + "telescope", "title": "Telescope" },
        { "url": LARAVEL_OFFICIAL + "valet", "title": "Valet" },
    ],
};

export default documentation;