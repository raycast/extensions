import { emit } from "./emit.ts";
import { type Easing, type Spring } from "./model.ts";

export function retimeSpring(easing: Easing, seconds: number): Spring {
  if (easing.kind !== "spring") throw new Error("Expected spring");
  if (!Number.isFinite(seconds) || seconds < 0.001 || seconds > 10)
    throw new Error("Invalid duration");
  // Retiming is an internal edit, not new external input. Re-parsing derived
  // stiffness rejects short periods or large masses under the input limits.
  return { ...easing, omega0: (2 * Math.PI) / seconds };
}

export function durationOutputs(easing: Easing, seconds?: number) {
  seconds ??= easing.kind !== "spring" ? easing.duration : undefined;
  const outputs = emit(easing);
  if (seconds === undefined || easing.kind === "spring") return outputs;
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 60)
    throw new Error("Invalid duration");
  return outputs.map((output) => {
    let code = output.code;
    if (output.id === "dtcg" && code === undefined)
      return {
        ...output,
        code: JSON.stringify(
          {
            duration: {
              $type: "duration",
              $value: { value: seconds, unit: "s" },
            },
          },
          null,
          2,
        ),
        fidelity: "Lossy" as const,
        note: "Only the explicitly supplied duration is exported; DTCG cannot represent this easing.",
      };
    if (code === undefined) return output;
    let note = output.note;
    let fidelity = output.fidelity;
    switch (output.id) {
      case "swiftui":
        code = code
          .replace("duration: 0.5", `duration: ${seconds}`)
          .replace("duration: Double = 0.5", `duration: Double = ${seconds}`);
        note = note.replace(
          "Duration is not in the input; the snippet uses 0.5s.",
          `Duration explicitly set to ${seconds}s.`,
        );
        break;
      case "css-bezier":
      case "css-linear":
        code = `transition-timing-function: ${code};\ntransition-duration: ${seconds}s;`;
        note += ` Duration explicitly set to ${seconds}s.`;
        break;
      case "motion":
        code = code.replace("{ ease:", `{ duration: ${seconds}, ease:`);
        break;
      case "compose":
        code = `tween(durationMillis = ${Math.round(seconds * 1000)}, easing = ${code})`;
        if (Math.abs(Math.round(seconds * 1000) / 1000 - seconds) > 1e-12) {
          fidelity = "Lossy";
          note += " Duration rounded to whole milliseconds for Compose.";
        }
        break;
      case "tailwind":
        code += ` duration-[${seconds}s]`;
        note = `Easing preserved; duration explicitly set to ${seconds}s.`;
        break;
      case "dtcg": {
        const token = JSON.parse(code);
        token.duration = {
          $type: "duration",
          $value: { value: seconds, unit: "s" },
        };
        code = JSON.stringify(token, null, 2);
        break;
      }
    }
    return { ...output, code, note, fidelity };
  });
}
