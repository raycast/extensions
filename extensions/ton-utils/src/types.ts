export type ConnectionData = {
  type: string;
  is_success: boolean;
  wallet_address: string;
  wallet_type: string;
  wallet_version: string;
  auth_type: string;
  custom_data: {
    chain_id: string;
    provider: string;
    ton_connect_sdk_lib: string;
    ton_connect_ui_lib: string | null;
  };
};
