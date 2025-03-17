const env = process.env.NODE_ENV || "production";
import development from "./development";
import production from "./production";

console.log("====================================");
console.log("==========> env: ", env, "<=========");
console.log("====================================");

export default {
  development,
  production,
}[env];
