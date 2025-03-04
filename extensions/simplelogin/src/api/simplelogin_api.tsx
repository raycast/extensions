import load_preferences from "../utils/preferences";
import axios from "axios";
import { Options } from "../models/alias_options";
import { Mailboxes } from "../models/mailboxes";
import { showToast, Toast } from "@raycast/api";
import { ParamNewAlias } from "../models/alias_options";
import { AliasResponse, LoadAllAliasResponse } from "../models/alias";

const preferences = load_preferences();

export const getAliasOptions = async (): Promise<Options> => {
  const api_token = preferences.api_token;
  const app_url = preferences.app_url;
  const options: Options = {
    can_create: false,
    prefix_suggestion: "",
    suffixes: [],
  };

  return axios
    .get(app_url + "/api/v5/alias/options", {
      headers: {
        Authentication: api_token,
        "content-type": "text/json",
      },
    })
    .then((response) => {
      return response.data as Options;
    })
    .catch((error) => {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
      showToast({
        style: Toast.Style.Failure,
        title: error.response.data.error,
      });
      return options;
    });
};

export const getMailboxes = async (): Promise<Mailboxes[]> => {
  const api_token = preferences.api_token;
  const app_url = preferences.app_url;

  return axios
    .get(app_url + "/api/mailboxes", {
      headers: {
        Authentication: api_token,
        "content-type": "text/json",
      },
    })
    .then((response) => {
      return response.data.mailboxes as Mailboxes[];
    })
    .catch((error) => {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
      showToast({
        style: Toast.Style.Failure,
        title: error.response.data.error,
      });
      return [];
    });
};

export async function createAlias(values: ParamNewAlias): Promise<AliasResponse | null> {
  const api_token = preferences.api_token;
  const app_url = preferences.app_url;
  const body = {
    alias_prefix: values.alias_prefix,
    signed_suffix: values.signed_suffix,
    mailbox_ids: [values.mailbox_id],
    note: values.note,
    name: values.alias_name,
  };

  return axios
    .post(app_url + "/api/v3/alias/custom/new", body, {
      headers: {
        Authentication: api_token,
      },
    })
    .then((response) => {
      return response.data as AliasResponse;
    })
    .catch((error) => {
      showToast({
        style: Toast.Style.Failure,
        title: error.response.data.error,
      });
      console.log(error.response.data.error);
      return null;
    });
}

export async function createRandomAlias(note: string): Promise<AliasResponse> {
  const api_token = preferences.api_token;
  const app_url = preferences.app_url;
  const mode = preferences.mode;

  const endpoint_url = `${app_url}/api/alias/random/new?mode=${mode}`;

  return axios
    .post(endpoint_url, note !== "" ? { note } : {}, {
      headers: {
        Authentication: api_token,
      },
    })
    .then((response) => {
      return response.data as AliasResponse;
    });
}

/**
 * loads all aliases from the API with a loop over all pages and returns them as an array
 */
export async function loadAllAliases(): Promise<AliasResponse[]> {
  let currentPage = 0;
  let loopActive = true;

  let allAliases: AliasResponse[] = [];

  while (loopActive) {
    const result = await loadAliasesPage(currentPage);
    if (result?.aliases?.length === 0 || result == null) {
      loopActive = false;
    } else {
      allAliases = allAliases.concat(result.aliases);
      currentPage++;
    }
  }
  return allAliases as AliasResponse[];
}

/**
 * load a single page of aliases from the API
 */
async function loadAliasesPage(page: number): Promise<LoadAllAliasResponse | null> {
  const api_token = preferences.api_token;
  const app_url = preferences.app_url;

  return axios
    .get(app_url + "/api/v2/aliases?page_id=" + page, {
      headers: {
        Authentication: api_token,
      },
    })
    .then((response) => {
      return response.data as LoadAllAliasResponse;
    })
    .catch(() => {
      return null;
    });
}

export async function updateAliasPinnedStatus(alias_id: number, pinned: boolean): Promise<boolean> {
  const api_token = preferences.api_token;
  const app_url = preferences.app_url;

  return axios
    .patch(
      app_url + "/api/aliases/" + alias_id,
      { pinned: pinned },
      {
        headers: {
          Authentication: api_token,
        },
      },
    )
    .then(() => {
      return true;
    })
    .catch(() => {
      return false;
    });
}

export async function deleteAlias(alias_id: number): Promise<boolean> {
  const api_token = preferences.api_token;
  const app_url = preferences.app_url;

  return axios
    .delete(app_url + "/api/aliases/" + alias_id, {
      headers: {
        Authentication: api_token,
      },
    })
    .then(() => {
      return true;
    })
    .catch(() => {
      return false;
    });
}

export async function toggleAliasState(alias_id: number, enabled: boolean): Promise<boolean> {
  const api_token = preferences.api_token;
  const app_url = preferences.app_url;

  return axios
    .post(
      app_url + "/api/aliases/" + alias_id + "/toggle",
      { enabled: enabled },
      {
        headers: {
          Authentication: api_token,
        },
      },
    )
    .then(() => {
      return true;
    })
    .catch(() => {
      return false;
    });
}
