/** Pulled from the upstream registry, never rebuilt here, so the artifact comes
 * from a party we do not control and the digest is its integrity check. */
export const DETECTOR_IMAGE =
  "ghcr.io/sgasser/pasteguard@sha256:0122664876c0635efddbc61b838ca9bf1b821878396d46d8126bb95afe8d6a3c";

export const CONTAINER_NAME = "caviarde-detector";

export const CONTAINER_PORT = 5002;

/** Upstream hardcodes the GLiNER label set, so organisations need a patched
 * copy of one file mounted over the image's own. */
export const PATCH_TARGET =
  "/opt/venv/lib/python3.14/site-packages/detector/gliner_layer.py";

/** Tuned for recall: the upstream defaults are set for precision and drop most
 * French names. */
export const FLOORS: Readonly<Record<string, string>> = {
  GLINER_FLOOR_PERSON: "0.95",
  GLINER_FLOOR_LOCATION: "0.70",
  GLINER_FLOOR_ADDRESS: "0.70",
  GLINER_FLOOR_ORGANIZATION: "0.50",
};

/** Raycast's Node process does not inherit a login shell, so PATH cannot be
 * trusted to contain docker. */
export const DOCKER_CANDIDATES: readonly string[] = [
  "/usr/local/bin/docker",
  "/opt/homebrew/bin/docker",
  "/usr/bin/docker",
  "/Applications/Docker.app/Contents/Resources/bin/docker",
];

/** Probed relative to the user's home, for runtimes that install per-user. */
export const DOCKER_HOME_CANDIDATES: readonly string[] = [
  ".docker/bin/docker",
  ".orbstack/bin/docker",
  ".rd/bin/docker",
  ".colima/bin/docker",
];
