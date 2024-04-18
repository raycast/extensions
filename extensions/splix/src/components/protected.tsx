import { Detail, Toast, showToast } from "@raycast/api";
import { useState, useEffect, ReactNode } from "react";
import * as google from "../auth/google";
import { supabase } from "../supabase";
import { Session } from "@supabase/supabase-js";

// Update the service name here for testing different providers

export default function Protected({ serviceName = "google", children }: { serviceName?: string; children: ReactNode }) {
  const service = getService(serviceName);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await service.authorize();
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          showToast({ style: Toast.Style.Failure, title: String(error) });
        } else {
          setSession(session);
        }
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
  }, [service]);

  if (!session) {
    return <Detail isLoading={true} />;
  }

  return <>{children}</>;
}

// Services
function getService(serviceName: string): Service {
  switch (serviceName) {
    case "google":
      return google as Service;
    default:
      throw new Error("Unsupported service: " + serviceName);
  }
}

interface Service {
  signOut(): Promise<void>;
  authorize(): Promise<void>;
  fetchItems(): Promise<{ id: string; title: string }[]>;
}
