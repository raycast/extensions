import { useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
import { localStorage } from "@ui/localstorage";
import ServerForm from "@ui/ServerForm/main";
import * as Context from "@ui/context";
import * as React from "react";
import { GlpiApiError } from "@api/glpi/main";
import AuthForm from "@ui/AuthForm/main";
import ListTickets from "./list";
import { getAssistanceTickets, initClientGlpi } from "@services/glpi";

export function TicketView(): React.ReactElement {
  /* Raycast */
  const { push } = useNavigation();

  /* GLPI Server Config */
  const {
    data: glpiServerConfig,
    isLoading: isLoadingGlpiServerConfig,
    revalidate: revalidateGlpiServerConfig,
  } = usePromise(() => localStorage.getGlpiServerConfig(), [], {
    /* Push <ServerForm/> if no Glpi Server is configured */
    onData(data) {
      if (!data || data.length === 0) push(<ServerForm revalidate={revalidateGlpiServerConfig} />);
      if (data && data.length > 0) revalidateSelectedGlpiServer();
    },
  });

  /* Selected GLPI Server */
  const {
    data: selectedGlpiServer,
    isLoading: isLoadingSelectedGlpiServer,
    revalidate: revalidateSelectedGlpiServer,
  } = usePromise(() => localStorage.getSelectedGlpiServer(), [], {
    execute: false,
    onData(data) {
      if (!glpiServerConfig) return;

      const config = glpiServerConfig.find((v) => v.uuid === data);
      if (config) initClientGlpi(config.endpoint, config.clientid, config.clientsecret);
    },
  });

  /* Filter */
  const [filter, setFilter] = React.useState<string>("status.id==1");

  /* Tickets */
  const {
    data: tickets,
    isLoading: isLoadingTickets,
    revalidate: revalidateTickets,
  } = useCachedPromise(getAssistanceTickets, [selectedGlpiServer, filter, undefined, undefined, "date_mod:desc"], {
    execute: false,
    onError(error) {
      if (error instanceof GlpiApiError && error.code === "GLPI_API_SERVER_AUTH_EXPIRED") {
        const server = glpiServerConfig?.find((v) => v.uuid === selectedGlpiServer);
        if (server) push(<AuthForm glpiServer={server} revalidate={revalidateTickets} />);
        return;
      }
      showFailureToast(error);
    },
  });

  /* isLoading */
  const isLoading = React.useMemo(() => {
    return isLoadingGlpiServerConfig || isLoadingSelectedGlpiServer || isLoadingTickets;
  }, [isLoadingGlpiServerConfig, isLoadingSelectedGlpiServer, isLoadingTickets]);

  /* Context */
  const ctxIsLoading = React.useMemo(() => {
    return {
      isLoading: isLoading,
    };
  }, [isLoading]);
  const ctxGlpiServer = React.useMemo(() => {
    return {
      glpiServerConfig: glpiServerConfig,
      revalidateGlpiServerConfig: revalidateGlpiServerConfig,
      selectedGlpiServer: selectedGlpiServer,
      revalidateSelectedGlpiServer: revalidateSelectedGlpiServer,
      revalidateData: revalidateTickets,
    };
  }, [glpiServerConfig, revalidateGlpiServerConfig, selectedGlpiServer, revalidateGlpiServerConfig]);

  /* Revalidate 'tickets' */
  React.useEffect(() => {
    if (filter && selectedGlpiServer && glpiServerConfig) revalidateTickets();
  }, [filter, glpiServerConfig, selectedGlpiServer]);

  return (
    <Context.isLoading value={ctxIsLoading}>
      <Context.glpiServer value={ctxGlpiServer}>
        <ListTickets tikets={tickets} setFilter={setFilter} />
      </Context.glpiServer>
    </Context.isLoading>
  );
}
