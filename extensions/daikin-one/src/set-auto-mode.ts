import { setTargetState, TargetHeatingCoolingState } from "./daikin-api";

export default async function main() {
  await setTargetState(TargetHeatingCoolingState.AUTO);
}
