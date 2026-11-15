import { Ticket } from "@api/glpi/types";
import { useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import type * as Types from "@ui/types";
import * as Context from "@ui/context";
import * as React from "react";
import { GlpiApiError } from "@api/glpi/main";
import AuthForm from "@ui/AuthForm/main";
import ListFollowups from "./list";
import { getAssistanceTicketFollowups } from "@services/glpi";

interface Props {
  glpiServerConfig: Types.GlpiServer;
  ticket: Ticket;
}

export default function FollowupView({ glpiServerConfig, ticket }: Props): React.ReactElement {
  /* Raycast */
  const { push } = useNavigation();

  /* Followups */
  const {
    data: followups,
    isLoading: isLoadingFollowups,
    revalidate: revalidateFollowups,
  } = useCachedPromise(getAssistanceTicketFollowups, [ticket.id], {
    onError(error) {
      if (error instanceof GlpiApiError && error.code === "GLPI_API_SERVER_AUTH_EXPIRED") {
        push(<AuthForm glpiServer={glpiServerConfig} />);
        return;
      }
      showFailureToast(error);
    },
  });

  /* isLoading */
  const isLoading = React.useMemo(() => {
    return isLoadingFollowups;
  }, [isLoadingFollowups]);

  /* Context */
  const ctxIsLoading = React.useMemo(() => {
    return {
      isLoading: isLoading,
    };
  }, [isLoading]);

  return (
    <Context.isLoading value={ctxIsLoading}>
      <ListFollowups
        config={glpiServerConfig}
        ticket={ticket}
        followups={followups}
        revalidateFollowups={revalidateFollowups}
      />
    </Context.isLoading>
  );
}
