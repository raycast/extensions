import API from "@api-blueprints/pathmaker";

export function api(token: string, domain: string) {
  return new API({
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    baseUrl: "https://" + domain + "/api/v1",
  });
}
