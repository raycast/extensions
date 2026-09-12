import { KubernetesObject } from "@kubernetes/client-node";

export function kubernetesObjectAge(object: KubernetesObject) {
  const creationTimestamp = object.metadata?.creationTimestamp;
  if (!creationTimestamp) {
    return "<invalid>";
  }
  const now = new Date();
  return humanDuration(now.getTime() - creationTimestamp.getTime());
}

// Reference: https://github.com/kubernetes/apimachinery/blob/a8f449e276fe566efddb149992049c78f0088492/pkg/util/duration/duration.go#L48
function humanDuration(d: number): string {
  // Allow deviation no more than 2 seconds(excluded) to tolerate machine time
  // inconsistence, it can be considered as almost now.
  const seconds = Math.floor(d / 1000);
  if (seconds < -1) {
    return "<invalid>";
  } else if (seconds < 0) {
    return "0s";
  } else if (seconds < 60 * 2) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(d / (1000 * 60));
  if (minutes < 10) {
    const s = Math.floor((d / 1000) % 60);
    if (s === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m${s}s`;
  } else if (minutes < 60 * 3) {
    return `${minutes}m`;
  }

  const hours = Math.floor(d / (1000 * 60 * 60));
  if (hours < 8) {
    const m = Math.floor((d / (1000 * 60)) % 60);
    if (m === 0) {
      return `${hours}h`;
    }
    return `${hours}h${m}m`;
  } else if (hours < 48) {
    return `${hours}h`;
  } else if (hours < 24 * 8) {
    const h = hours % 24;
    if (h === 0) {
      return `${Math.floor(hours / 24)}d`;
    }
    return `${Math.floor(hours / 24)}d${h}h`;
  } else if (hours < 24 * 365 * 2) {
    return `${Math.floor(hours / 24)}d`;
  } else if (hours < 24 * 365 * 8) {
    const dy = Math.floor(hours / 24) % 365;
    if (dy === 0) {
      return `${Math.floor(hours / (24 * 365))}y`;
    }
    return `${Math.floor(hours / (24 * 365))}y${dy}d`;
  }
  return `${Math.floor(hours / (24 * 365))}y`;
}
