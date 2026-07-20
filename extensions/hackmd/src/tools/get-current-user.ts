import api from "../lib/api";

export default async function () {
  return api.getMe();
}
