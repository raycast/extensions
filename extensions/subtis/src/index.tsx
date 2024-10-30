import {
  Action,
  ActionPanel,
  Form,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import { stat } from "fs/promises";
import fetch from "node-fetch";
import { match } from "ts-pattern";
import WebSocket from "ws";
import { z } from "zod";

// constants
// const API_URL =
//   process.env.NODE_ENV === "production"
//     ? "https://api.subt.is"
//     : "http://localhost:58602";
const API_URL = "https://api.subt.is";
const VIDEO_FILE_EXTENSIONS = [
  ".mkv",
  ".mp4",
  ".avi",
  ".mov",
  ".wmv",
  ".flv",
  ".webm",
  ".vob",
  ".m4v",
  ".mpg",
  ".mpeg",
  ".3gp",
  ".3g2",
] as const;

// helpers
function getFilenameFromPath(path: string): string {
  return path.split(/[\\/]/).at(-1) as string;
}

function getMessageFromStatusCode(statusCode: number): {
  description: string;
  title: string;
} {
  return match(statusCode)
    .with(415, () => ({
      title: "Extensión de archivo no soportada",
      description: "Prueba con formatos como MKV, MP4, o AVI",
    }))
    .with(404, () => ({
      title: "Subtitulo no encontrado",
      description: "Nos pondremos a buscarlo",
    }))
    .with(500, () => ({
      title: "Error Inesperado",
      description: "Estamos haciendo arreglos del servicio",
    }))
    .otherwise(() => ({
      title: "Error desconocido",
      description: "Estamos haciendo arreglos del servicio",
    }));
}

function getVideoFileExtension(fileName: string): string | undefined {
  return VIDEO_FILE_EXTENSIONS.find((videoFileExtension) =>
    fileName.endsWith(videoFileExtension),
  );
}

// schemas
const subtitleSchema = z.object({
  subtitle: z.object({
    id: z.number(),
    bytes: z.number(),
    is_valid: z.boolean(),
    resolution: z.string(),
    subtitle_link: z.string(),
    queried_times: z.number().nullable(),
    current_season: z.number().nullable(),
    current_episode: z.number().nullable(),
    title_file_name: z.string(),
    subtitle_file_name: z.string(),
  }),
  title: z.object({
    id: z.number(),
    imdb_id: z.string(),
    title_name: z.string(),
    type: z.string(),
    year: z.number(),
    queried_times: z.number(),
    searched_times: z.number(),
    poster: z.string().nullable(),
    backdrop: z.string().nullable(),
  }),
  releaseGroup: z.object({
    id: z.number(),
    release_group_name: z.string(),
  }),
  subtitleGroup: z.object({
    id: z.number(),
    subtitle_group_name: z.string(),
  }),
});

const wsMessageSchema = z.object({
  total: z.number(),
  message: z.string(),
});

const wsOkSchema = z.object({
  ok: z.boolean(),
});

// types
type WsOk = z.infer<typeof wsOkSchema>;
type SubtisSubtitle = z.infer<typeof subtitleSchema>;
type Values = { filePicker: string[] };

// helpers
async function getPrimarySubtitle({
  bytes,
  fileName,
}: {
  bytes: string;
  fileName: string;
}): Promise<SubtisSubtitle | null> {
  const response = await fetch(
    `${API_URL}/v1/subtitle/file/name/${bytes}/${fileName}`,
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to fetch primary subtitle", {
      cause: response.status,
    });
  }

  const data = await response.json();
  const primarySubtitle = subtitleSchema.parse(data);

  fetch(`${API_URL}/v1/subtitle/metrics/download`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titleId: primarySubtitle.title.id,
      subtitleId: primarySubtitle.subtitle.id,
    }),
  });

  return primarySubtitle;
}

export async function getAlternativeSubtitle({
  fileName,
}: {
  fileName: string;
}): Promise<SubtisSubtitle> {
  const response = await fetch(
    `${API_URL}/v1/subtitle/file/alternative/${fileName}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch alternative subtitle", {
      cause: response.status,
    });
  }

  const data = await response.json();
  const alternativeSubtitle = subtitleSchema.parse(data);

  fetch(`${API_URL}/v1/subtitle/metrics/download`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titleId: alternativeSubtitle.title.id,
      subtitleId: alternativeSubtitle.subtitle.id,
    }),
  });

  return alternativeSubtitle;
}

async function downloadSubtitle(toast: Toast, subtitle: SubtisSubtitle) {
  Object.assign(toast, {
    style: Toast.Style.Animated,
    title: "Subtitulo encontrado!",
    message: "Descargando subtitulo...",
  });

  await open(subtitle.subtitle.subtitle_link);

  Object.assign(toast, {
    message: "Encontralo en Descargas",
    style: Toast.Style.Success,
    title: "Subtitulo descargado!",
  });
}

export default function Command() {
  // handlers
  async function handleSubmit(values: Values) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Buscando subtítulos",
    });

    try {
      const [file] = values.filePicker;

      const fileStats = await stat(file);
      const bytes = fileStats.size;

      const fileName = getFilenameFromPath(file);
      const videoFileExtension = getVideoFileExtension(fileName);
      const videoFileExtensionParsed = z.string().safeParse(videoFileExtension);

      if (!videoFileExtensionParsed.success) {
        Object.assign(toast, {
          message: "Extension de video no soportada.",
          style: Toast.Style.Failure,
          title: "Error de extensión",
        });
        return;
      }

      const primarySubtitle = await getPrimarySubtitle({
        bytes: String(bytes),
        fileName,
      });

      if (primarySubtitle) {
        return await downloadSubtitle(toast, primarySubtitle);
      }

      const websocketData = await new Promise<WsOk>((resolve) => {
        const ws = new WebSocket("https://socketdex.subt.is");

        ws.on("open", () => {
          Object.assign(toast, {
            style: Toast.Style.Animated,
            title: "Buscando subtítulo en tiempo real",
          });

          const message = {
            subtitle: {
              bytes: Number(bytes),
              titleFileName: fileName,
            },
          };

          ws.send(JSON.stringify(message));
        });

        ws.on("message", (messageEvent: Buffer) => {
          const data = messageEvent.toString();
          const parsedData = JSON.parse(data);

          const okSafeParsed = wsOkSchema.safeParse(parsedData);
          const messageSafeParsed = wsMessageSchema.safeParse(parsedData);

          if (okSafeParsed.success && okSafeParsed.data.ok === true) {
            resolve(okSafeParsed.data);
          }

          if (okSafeParsed.success && okSafeParsed.data.ok === false) {
            Object.assign(toast, {
              message: "",
              style: Toast.Style.Failure,
              title: "Falla en tiempo real",
            });
            resolve(okSafeParsed.data);
          }

          if (messageSafeParsed.success) {
            Object.assign(toast, {
              message: `${messageSafeParsed.data.total * 100}%`,
              style: Toast.Style.Animated,
              title: "Buscando subtítulo...",
            });
          }
        });

        ws.on("error", () => {
          resolve({ ok: false });
        });
      });

      if (websocketData.ok === true) {
        const primarySubtitle = await getPrimarySubtitle({
          bytes: String(bytes),
          fileName,
        });

        if (primarySubtitle) {
          return await downloadSubtitle(toast, primarySubtitle);
        }
      }

      const alternativeSubtitle = await getAlternativeSubtitle({ fileName });

      if (alternativeSubtitle) {
        return await downloadSubtitle(toast, alternativeSubtitle);
      }

      Object.assign(toast, {
        message: "Estamos trabajando en ello.",
        style: Toast.Style.Failure,
        title: "Subtitulo no encontrado",
      });
    } catch (error) {
      if (error instanceof Error && typeof error.cause === "number") {
        const { description, title } = getMessageFromStatusCode(error.cause);
        Object.assign(toast, {
          title,
          message: description,
          style: Toast.Style.Failure,
        });
        return;
      }

      if (error instanceof Error) {
        Object.assign(toast, {
          message: error.message,
          style: Toast.Style.Failure,
          title: "Error interno",
        });
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        allowMultipleSelection={false}
        id="filePicker"
        title="Buscar subtitulo para"
      />
    </Form>
  );
}
