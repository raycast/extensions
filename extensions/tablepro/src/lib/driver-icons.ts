import { Color, Icon, Image } from "@raycast/api";

export function connectionIcon(type: string): Image.ImageLike {
  const lower = type.toLowerCase();
  switch (lower) {
    case "postgresql":
    case "postgres":
    case "redshift":
      return { source: Icon.HardDrive, tintColor: Color.Blue };
    case "mysql":
    case "mariadb":
      return { source: Icon.HardDrive, tintColor: Color.Orange };
    case "sqlite":
    case "libsql":
      return { source: Icon.HardDrive, tintColor: Color.SecondaryText };
    case "mongodb":
      return { source: Icon.HardDrive, tintColor: Color.Green };
    case "redis":
      return { source: Icon.HardDrive, tintColor: Color.Red };
    case "clickhouse":
      return { source: Icon.HardDrive, tintColor: Color.Yellow };
    case "duckdb":
      return { source: Icon.HardDrive, tintColor: Color.Yellow };
    case "mssql":
      return { source: Icon.HardDrive, tintColor: Color.Red };
    case "oracle":
      return { source: Icon.HardDrive, tintColor: Color.Red };
    case "cassandra":
      return { source: Icon.HardDrive, tintColor: Color.Purple };
    case "bigquery":
      return { source: Icon.HardDrive, tintColor: Color.Blue };
    case "dynamodb":
      return { source: Icon.HardDrive, tintColor: Color.Orange };
    case "cloudflared1":
    case "cloudflare_d1":
      return { source: Icon.HardDrive, tintColor: Color.Orange };
    case "etcd":
      return { source: Icon.HardDrive, tintColor: Color.Blue };
    default:
      return { source: Icon.HardDrive, tintColor: Color.PrimaryText };
  }
}
