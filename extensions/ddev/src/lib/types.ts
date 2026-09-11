export type DdevProject = {
  name: string;
  type: string;
  status: string;
  approot: string;
  primary_url: string;
};

export type DdevDescribeRaw = {
  name: string;
  type: string;
  status: string;
  status_desc?: string;
  approot: string;
  shortroot?: string;
  docroot?: string;
  primary_url: string;
  urls?: string[];
  router?: string;
  router_status?: string;
  php_version?: string;
  nodejs_version?: string;
  webserver_type?: string;
  performance_mode?: string;
  xdebug_enabled?: boolean;
  dbinfo?: {
    database_type: string;
    database_version: string;
    dbname: string;
    host: string;
    username: string;
    password: string;
    dbPort: string;
    published_port: number;
  };
  mailpit_url?: string;
  mailpit_https_url?: string;
  services?: Record<
    string,
    {
      short_name: string;
      status: string;
      image: string;
      http_url?: string;
      https_url?: string;
    }
  >;
};

export type DdevSnapshot = {
  Name: string;
  Created: string;
};
