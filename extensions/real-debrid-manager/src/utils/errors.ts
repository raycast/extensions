const ERROR_MAP = {
  hoster_not_free: "Must have a premium account to access resource",
  hoster_unsupported: "Hoster is not supported",
  wrong_torrent_file_invalid: "Invalid torrent file",
  unknown_ressource: "Unknown resource",
  bad_token: "User token is invalid",
  wrong_parameter: "Wrong parameter",
};

type ErrorKey = keyof typeof ERROR_MAP;

export const formatErrorMessage = (server_message: string) => {
  return ERROR_MAP?.[server_message as ErrorKey] || "Something went wrong";
};
