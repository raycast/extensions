export type Environment = "test" | "live";
export type EnvProps = { environment: Environment; setEnvironment: (environment: Environment) => void };
