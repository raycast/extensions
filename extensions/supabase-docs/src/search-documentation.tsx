import { ActionPanel, List, Action } from "@raycast/api";

export default function SearchDocumentation() {
  return (
    <List>
      {Object.entries(documentation).map(([section, items]) => (
        <List.Section title={section} key={section}>
          {items.map((item) => (
            <List.Item
              key={item.url}
              icon="supabase-logo.png"
              title={item.title}
              keywords={[item.title, section]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={item.url} />
                  <Action.CopyToClipboard title="Copy URL" content={item.url} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

const documentation = {
  Overview: [
    {
      url: "https://supabase.com/docs",
      title: "Introduction",
    },
    {
      url: "https://supabase.com/docs/architecture",
      title: "Architecture",
    },
    {
      url: "https://supabase.com/docs/guides/hosting/platform",
      title: "Supabase Platform",
    },
    {
      url: "https://supabase.com/docs/guides/local-development",
      title: "Local Development",
    },
    {
      url: "https://supabase.com/docs/guides/examples",
      title: "Examples and Resources",
    },
  ],
  Quickstarts: [
    {
      url: "https://tailwindcss.com/docs/adding-base-styles",
      title: "Quickstart: Angular",
    },
    {
      url: "https://supabase.com/docs/guides/with-expo",
      title: "Quickstart: Expo",
    },
    {
      url: "https://supabase.com/docs/guides/with-flutter",
      title: "Quickstart: Flutter",
    },
    {
      url: "https://supabase.com/docs/guides/with-ionic-angular",
      title: "Quickstart: Ionic Angular",
    },
    {
      url: "https://supabase.com/docs/guides/with-ionic-react",
      title: "Quickstart: Ionic React",
    },
    {
      url: "https://supabase.com/docs/guides/with-ionic-vue",
      title: "Quickstart: Ionic Vue",
    },
    {
      url: "https://supabase.com/docs/guides/with-nextjs",
      title: "Quickstart: Next.js",
    },
    {
      url: "https://supabase.com/docs/guides/with-react",
      title: "Quickstart: React",
    },
    {
      url: "https://supabase.com/docs/guides/with-redwoodjs",
      title: "Quickstart: RedwoodJS",
    },
    {
      url: "https://supabase.com/docs/guides/with-solidjs",
      title: "Quickstart: SolidJS",
    },
    {
      url: "https://supabase.com/docs/guides/with-svelte",
      title: "Quickstart: Svelte",
    },
    {
      url: "https://supabase.com/docs/guides/with-vue-3",
      title: "Quickstart: Vue 3",
    },
  ],
  Database: [
    {
      url: "https://supabase.com/docs/guides/database",
      title: "Database",
    },
    {
      url: "https://supabase.com/docs/guides/database/connecting-to-postgres",
      title: "Connecting",
    },
    {
      url: "https://supabase.com/docs/guides/database/tables",
      title: "Tables and Data",
    },
    {
      url: "https://supabase.com/docs/guides/database/functions",
      title: "Database Functions",
    },
    {
      url: "https://supabase.com/docs/guides/database/full-text-search",
      title: "Full Text Search",
    },
  ],
  Extensions: [
    {
      url: "https://supabase.com/docs/guides/database/extensions",
      title: "Overview",
    },
    {
      url: "https://supabase.com/docs/guides/database/extensions/plv8",
      title: "plv8: JavaScript Language",
    },
    {
      url: "https://supabase.com/docs/guides/database/extensions/http",
      title: "http: RESTful Client",
    },
    {
      url: "https://supabase.com/docs/guides/database/extensions/uuid-ossp",
      title: "uuid-ossp: Unique Identifiers",
    },
  ],
  Configuration: [
    {
      url: "https://supabase.com/docs/guides/database/timeouts",
      title: "Timeouts",
    },
    {
      url: "https://supabase.com/docs/guides/database/replication",
      title: "Replication",
    },
    {
      url: "https://supabase.com/docs/guides/database/managing-passwords",
      title: "Passwords",
    },
    {
      url: "https://supabase.com/docs/guides/database/managing-timezones",
      title: "Timezones",
    },
  ],
  APIs: [
    {
      url: "https://supabase.com/docs/guides/api",
      title: "APIs",
    },
    {
      url: "https://supabase.com/docs/guides/api/generating-types",
      title: "Generating Types",
    },
  ],
  Functions: [
    {
      url: "https://supabase.com/docs/guides/functions",
      title: "Edge Functions",
    },
  ],
  Auth: [
    {
      url: "https://supabase.com/docs/guides/auth",
      title: "Auth",
    },
  ],
  Authentication: [
    {
      url: "https://supabase.com/docs/guides/auth/auth-email",
      title: "Login With Email",
    },
    {
      url: "https://supabase.com/docs/guides/auth/auth-magic-link",
      title: "Login With Magic Link",
    },
    {
      url: "https://supabase.com/docs/guides/auth/auth-apple",
      title: "Login with Apple",
    },
    {
      url: "https://supabase.com/docs/guides/auth/auth-azure",
      title: "Login with Azure",
    },
    {
      url: "https://supabase.com/docs/guides/auth/auth-bitbucket",
      title: "Login with Bitbucket",
    },
    {
      url: "https://supabase.com/docs/guides/auth/auth-discord",
      title: "Login with Discord",
    },
    {
      url: "https://supabase.com/docs/guides/auth/auth-facebook",
      title: "Login with Facebook",
    },
    {
      url: "https://supabase.com/docs/guides/auth/auth-github",
      title: "Login with GitHub",
    },
    {
      url: "https://supabase.com/docs/guides/auth/auth-gitlab",
      title: "Login with GitLab",
    },
    {
      url: "https://supabase.com/docs/guides/auth/auth-google",
      title: "Login with Google",
    },
    {
      url: "https://supabase.com/docs/guides/auth/auth-keycloak",
      title: "Login with Keycloak",
    },
    {
      url: "https://supabase.com/docs/guides/auth/auth-linkedin",
      title: "Login with LinkedIn",
    },
    {
      url: "https://supabase.com/docs/guides/auth/auth-notion",
      title: "Login with Notion",
    },
    {
      url: "https://supabase.com/docs/guides/auth/auth-slack",
      title: "Login with Slack",
    },
    {
      url: "https://supabase.com/docs/guides/auth/auth-spotify",
      title: "Login with Spotify",
    },
    {
      url: "https://supabase.com/docs/guides/auth/auth-twitch",
      title: "Login with Twitch",
    },
    {
      url: "https://supabase.com/docs/guides/auth/auth-twitter",
      title: "Login with Twitter",
    },
    {
      url: "https://supabase.com/docs/guides/auth/auth-workos",
      title: "Login with WorkOS",
    },
    {
      url: "https://supabase.com/docs/guides/auth/auth-zoom",
      title: "Login with Zoom",
    },
    {
      url: "https://supabase.com/docs/guides/auth/auth-twilio",
      title: "Phone Auth with Twilio",
    },
    {
      url: "https://supabase.com/docs/guides/auth/auth-vonage",
      title: "Phone Auth with Vonage",
    },
    {
      url: "https://supabase.com/docs/guides/auth/auth-messagebird",
      title: "Phone Auth with MessageBird",
    },
  ],
  Authorization: [
    {
      url: "https://supabase.com/docs/guides/auth/row-level-security",
      title: "Row Level Security",
    },
    {
      url: "https://supabase.com/docs/guides/auth/managing-user-data",
      title: "Managing User Data",
    },
  ],
  "Deep Dive": [
    {
      url: "https://supabase.com/docs/learn/auth-deep-dive/auth-deep-dive-jwts",
      title: "Part One: JWTs",
    },
    {
      url: "https://supabase.com/docs/learn/auth-deep-dive/auth-row-level-security",
      title: "Part Two: Row Level Security",
    },
    {
      url: "https://supabase.com/docs/learn/auth-deep-dive/auth-policies",
      title: "Part Three: Policies",
    },
    {
      url: "https://supabase.com/docs/learn/auth-deep-dive/auth-gotrue",
      title: "Part Four: GoTrue",
    },
    {
      url: "https://supabase.com/docs/learn/auth-deep-dive/auth-google-oauth",
      title: "Part Five: Google Oauth",
    },
  ],
  Storage: [
    {
      url: "https://supabase.com/docs/guides/storage",
      title: "Storage",
    },
  ],
  Platform: [
    {
      url: "https://supabase.com/docs/guides/platform/logs",
      title: "Logging",
    },
    {
      url: "https://supabase.com/docs/going-into-prod",
      title: "Production Readiness",
    },
  ],
  "Self Hosting": [
    {
      url: "https://supabase.com/docs/guides/hosting/overview",
      title: "Overview",
    },
    {
      url: "https://supabase.com/docs/guides/hosting/docker",
      title: "With Docker",
    },
  ],
  Integrations: [
    {
      url: "https://supabase.com/docs/guides/integrations/appsmith",
      title: "Appsmith",
    },
    {
      url: "https://supabase.com/docs/guides/integrations/auth0",
      title: "Auth0",
    },
    {
      url: "https://supabase.com/docs/guides/integrations/clerk",
      title: "Clerk",
    },
    {
      url: "https://supabase.com/docs/guides/integrations/draftbit",
      title: "Draftbit",
    },
    {
      url: "https://supabase.com/docs/guides/integrations/pgmustard",
      title: "pgMustard",
    },
    {
      url: "https://supabase.com/docs/guides/integrations/plasmic",
      title: "Plasmic",
    },
    {
      url: "https://supabase.com/docs/guides/integrations/prisma",
      title: "Prisma",
    },
    {
      url: "https://supabase.com/docs/guides/integrations/snaplet",
      title: "Snaplet",
    },
    {
      url: "https://supabase.com/docs/guides/integrations/stytch",
      title: "Stytch",
    },
    {
      url: "https://supabase.com/docs/guides/integrations/vercel",
      title: "Vercel",
    },
  ],
  "See Also": [
    {
      url: "https://supabase.com/docs/faq",
      title: "FAQs",
    },
    {
      url: "https://supabase.com/docs/handbook/contributing",
      title: "Contributing",
    },
    {
      url: "https://supabase.com/docs/handbook/supasquad",
      title: "SupaSquad",
    },
    {
      url: "https://supabase.com/docs/company/terms",
      title: "Terms of Service",
    },
    {
      url: "https://supabase.com/docs/company/privacy",
      title: "Privacy Policy",
    },
    {
      url: "https://supabase.com/docs/company/aup",
      title: "Acceptable Use Policy",
    },
    {
      url: "https://supabase.com/docs/company/sla",
      title: "Service Level Agreement",
    },
  ],
  JavaScript: [
    {
      url: "https://supabase.com/docs/reference/javascript/supabase-client",
      title: "Supabase Client",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/installing",
      title: "Installing",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/initializing",
      title: "Initializing",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/generating-types",
      title: "Generating Types",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/auth-signup",
      title: "signUp()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/auth-signin",
      title: "signIn()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/auth-signout",
      title: "signOut()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/auth-session",
      title: "session()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/auth-user",
      title: "user()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/auth-update",
      title: "update()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/auth-setauth",
      title: "setAuth()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/auth-onauthstatechange",
      title: "onAuthStateChange()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/auth-api-getuser",
      title: "getUser()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/auth-api-resetpasswordforemail",
      title: "resetPasswordForEmail()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/auth-api-createuser",
      title: "createUser()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/auth-api-deleteuser",
      title: "deleteUser()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/auth-api-generatelink",
      title: "generateLink()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/auth-api-inviteuserbyemail",
      title: "inviteUserByEmail()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/auth-api-sendmobileotp",
      title: "sendMobileOTP()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/auth-api-updateuserbyid",
      title: "updateUserById()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/invoke",
      title: "invoke()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/select",
      title: "Fetch data: select()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/insert",
      title: "Create data: insert()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/update",
      title: "Modify data: update()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/upsert",
      title: "Upsert data: upsert()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/delete",
      title: "Delete data: delete()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/rpc",
      title: "Postgres functions: rpc()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/subscribe",
      title: "on().subscribe()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/removesubscription",
      title: "removeSubscription()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/removeallsubscriptions",
      title: "removeAllSubscriptions()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/getsubscriptions",
      title: "getSubscriptions()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/storage-createbucket",
      title: "createBucket()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/storage-getbucket",
      title: "getBucket()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/storage-listbuckets",
      title: "listBuckets()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/storage-updatebucket",
      title: "updateBucket()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/storage-deletebucket",
      title: "deleteBucket()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/storage-emptybucket",
      title: "emptyBucket()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/storage-from-upload",
      title: "from.upload()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/storage-from-download",
      title: "from.download()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/storage-from-list",
      title: "from.list()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/storage-from-update",
      title: "from.update()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/storage-from-move",
      title: "from.move()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/storage-from-copy",
      title: "from.copy()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/storage-from-remove",
      title: "from.remove()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/storage-from-createsignedurl",
      title: "from.createSignedUrl()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/storage-from-createsignedurls",
      title: "from.createSignedUrls()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/storage-from-getpublicurl",
      title: "from.getPublicUrl()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/using-modifiers",
      title: "Using Modifiers",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/limit",
      title: "limit()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/order",
      title: "order()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/range",
      title: "range()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/single",
      title: "single()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/maybesingle",
      title: "maybeSingle()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/using-filters",
      title: "Using Filters",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/or",
      title: ".or()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/not",
      title: ".not()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/match",
      title: ".match()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/eq",
      title: ".eq()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/neq",
      title: ".neq()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/gt",
      title: ".gt()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/gte",
      title: ".gte()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/lt",
      title: ".lt()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/lte",
      title: ".lte()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/like",
      title: ".like()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/ilike",
      title: ".ilike()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/is",
      title: ".is()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/in",
      title: ".in()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/contains",
      title: ".contains()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/containedby",
      title: ".containedBy()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/rangelt",
      title: ".rangeLt()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/rangegt",
      title: ".rangeGt()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/rangegte",
      title: ".rangeGte()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/rangelte",
      title: ".rangeLte()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/rangeadjacent",
      title: ".rangeAdjacent()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/overlaps",
      title: ".overlaps()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/textsearch",
      title: ".textSearch()",
    },
    {
      url: "https://supabase.com/docs/reference/javascript/filter",
      title: ".filter()",
    },
  ],
  Dart: [
    {
      url: "https://supabase.com/docs/reference/dart/supabase-client",
      title: "Supabase Client",
    },
    {
      url: "https://supabase.com/docs/reference/dart/installing",
      title: "Installing",
    },
    {
      url: "https://supabase.com/docs/reference/dart/initializing",
      title: "Initializing",
    },
    {
      url: "https://supabase.com/docs/reference/dart/generating-types",
      title: "Generating Types",
    },
    {
      url: "https://supabase.com/docs/reference/dart/auth-signup",
      title: "signUp()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/auth-signin",
      title: "signIn()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/auth-signout",
      title: "signOut()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/auth-session",
      title: "session()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/auth-user",
      title: "user()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/auth-update",
      title: "update()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/auth-setauth",
      title: "setAuth()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/auth-onauthstatechange",
      title: "onAuthStateChange()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/auth-api-getuser",
      title: "getUser()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/auth-api-resetpasswordforemail",
      title: "resetPasswordForEmail()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/auth-api-createuser",
      title: "createUser()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/auth-api-deleteuser",
      title: "deleteUser()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/auth-api-generatelink",
      title: "generateLink()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/auth-api-inviteuserbyemail",
      title: "inviteUserByEmail()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/auth-api-sendmobileotp",
      title: "sendMobileOTP()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/auth-api-updateuserbyid",
      title: "updateUserById()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/invoke",
      title: "invoke()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/select",
      title: "Fetch data: select()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/insert",
      title: "Create data: insert()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/update",
      title: "Modify data: update()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/upsert",
      title: "Upsert data: upsert()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/delete",
      title: "Delete data: delete()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/rpc",
      title: "Postgres functions: rpc()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/subscribe",
      title: "on().subscribe()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/removesubscription",
      title: "removeSubscription()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/removeallsubscriptions",
      title: "removeAllSubscriptions()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/getsubscriptions",
      title: "getSubscriptions()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/storage-createbucket",
      title: "createBucket()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/storage-getbucket",
      title: "getBucket()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/storage-listbuckets",
      title: "listBuckets()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/storage-updatebucket",
      title: "updateBucket()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/storage-deletebucket",
      title: "deleteBucket()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/storage-emptybucket",
      title: "emptyBucket()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/storage-from-upload",
      title: "from.upload()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/storage-from-download",
      title: "from.download()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/storage-from-list",
      title: "from.list()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/storage-from-update",
      title: "from.update()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/storage-from-move",
      title: "from.move()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/storage-from-copy",
      title: "from.copy()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/storage-from-remove",
      title: "from.remove()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/storage-from-createsignedurl",
      title: "from.createSignedUrl()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/storage-from-createsignedurls",
      title: "from.createSignedUrls()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/storage-from-getpublicurl",
      title: "from.getPublicUrl()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/using-modifiers",
      title: "Using Modifiers",
    },
    {
      url: "https://supabase.com/docs/reference/dart/limit",
      title: "limit()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/order",
      title: "order()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/range",
      title: "range()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/single",
      title: "single()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/maybesingle",
      title: "maybeSingle()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/using-filters",
      title: "Using Filters",
    },
    {
      url: "https://supabase.com/docs/reference/dart/or",
      title: ".or()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/not",
      title: ".not()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/match",
      title: ".match()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/eq",
      title: ".eq()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/neq",
      title: ".neq()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/gt",
      title: ".gt()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/gte",
      title: ".gte()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/lt",
      title: ".lt()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/lte",
      title: ".lte()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/like",
      title: ".like()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/ilike",
      title: ".ilike()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/is",
      title: ".is()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/in",
      title: ".in()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/contains",
      title: ".contains()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/containedby",
      title: ".containedBy()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/rangelt",
      title: ".rangeLt()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/rangegt",
      title: ".rangeGt()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/rangegte",
      title: ".rangeGte()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/rangelte",
      title: ".rangeLte()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/rangeadjacent",
      title: ".rangeAdjacent()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/overlaps",
      title: ".overlaps()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/textsearch",
      title: ".textSearch()",
    },
    {
      url: "https://supabase.com/docs/reference/dart/filter",
      title: ".filter()",
    },
  ],
  CLI: [
    {
      url: "https://supabase.com/docs/reference/cli/about",
      title: "About",
    },
    {
      url: "https://supabase.com/docs/reference/cli/installing-and-updating",
      title: "Installing and Updating",
    },
    {
      url: "https://supabase.com/docs/reference/cli/config-reference",
      title: "Config reference",
    },

    {
      url: "https://supabase.com/docs/reference/cli/supabase-help",
      title: "supabase help",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-login",
      title: "supabase login",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-link",
      title: "supabase link",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-init",
      title: "supabase init",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-start",
      title: "supabase start",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-stop",
      title: "supabase stop",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-db-branch-list",
      title: "supabase db branch list",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-db-branch-create",
      title: "supabase db branch create",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-db-branch-delete",
      title: "supabase db branch delete",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-db-switch",
      title: "supabase db switch",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-db-changes",
      title: "supabase db changes",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-db-commit",
      title: "supabase db commit",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-db-reset",
      title: "supabase db reset",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-db-remote-set",
      title: "supabase db remote set",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-db-remote-commit",
      title: "supabase db remote commit",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-db-push",
      title: "supabase db push",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-functions-delete",
      title: "supabase functions delete",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-functions-deploy",
      title: "supabase functions deploy",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-functions-new",
      title: "supabase functions new",
    },

    {
      url: "https://supabase.com/docs/reference/cli/supabase-functions-serve",
      title: "supabase functions serve",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-migration-new",
      title: "supabase migration new",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-secrets-list",
      title: "supabase secrets list",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-secrets-set",
      title: "supabase secrets set",
    },
    {
      url: "https://supabase.com/docs/reference/cli/supabase-secrets-unset",
      title: "supabase secrets unset",
    },
  ],
};
