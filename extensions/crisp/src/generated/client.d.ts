import { Session } from "@supabase/supabase-js";
export declare function createClient({
  url,
  session,
  supabaseRef,
  fetch,
}: {
  session: Session;
  supabaseRef: string;
  url: string;
  fetch?: any;
}): {
  api: {
    v1: {
      conversations: import("hono/client").ClientRequest<{
        $get: {
          input: {};
          output: {
            ok: boolean;
            websites: {
              domain: string;
              websiteId: string;
              userId: string | null;
              crispPluginId: string;
              crispRole: string;
              crispUserId: string;
              createdAt: string;
              crispToken: string;
              logo: string | null;
            }[];
            conversations: {
              site:
                | {
                    domain: string;
                    websiteId: string;
                    userId: string | null;
                    crispPluginId: string;
                    crispRole: string;
                    crispUserId: string;
                    createdAt: string;
                    crispToken: string;
                    logo: string | null;
                  }
                | undefined;
              conversation: {
                session_id: string;
                website_id: string;
                people_id: string;
                status: number;
                state: string;
                is_verified: boolean;
                is_blocked: boolean;
                availability: string;
                active: {
                  now: boolean;
                };
                last_message: string;
                mentions: any[];
                participants: {
                  type: string;
                  target: string;
                }[];
                updated_at: number;
                created_at: number;
                unread: {
                  operator: number;
                  visitor: number;
                };
                assigned: {
                  user_id: string;
                };
                meta: {
                  nickname: string;
                  email: string;
                  ip: string;
                  avatar: any;
                  device: {
                    capabilities: string[];
                    geolocation: {
                      country: string;
                      region: string;
                      city: string;
                      coordinates: {
                        latitude: number;
                        longitude: number;
                      };
                    };
                    system: {
                      os: {
                        version: string;
                        name: string;
                      };
                      engine: {
                        name: string;
                        version: string;
                      };
                      browser: {
                        major: string;
                        version: string;
                        name: string;
                      };
                      useragent: string;
                    };
                    timezone: number;
                    locales: string[];
                  };
                  segments: string[];
                };
              };
            }[];
          };
          outputFormat: "json";
          status: import("hono/utils/http-status").StatusCode;
        };
      }>;
    };
  };
} & {
  api: {
    v1: {
      health: import("hono/client").ClientRequest<{
        $get: {
          input: {};
          output: {
            ok: boolean;
          };
          outputFormat: "json";
          status: import("hono/utils/http-status").StatusCode;
        };
      }>;
    };
  };
};
