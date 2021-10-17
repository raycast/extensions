import { Endpoints } from "@octokit/types";

type Flatten<Type> = Type extends Array<infer Item> ? Item : Type;

type SearchRepositoryResponse = Endpoints["GET /search/repositories"]["response"];

export type Repository = Flatten<SearchRepositoryResponse["data"]["items"]>;
