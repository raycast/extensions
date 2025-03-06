import { Form, ActionPanel, Action, showToast, Toast, popToRoot } from "@raycast/api";
import React, { useState } from "react";
import fs from "fs";
import path from "path";
import { parseOTPFromJSON } from "../utils/parser";
import { saveOTPConfigs, loadOTPConfigs } from "../utils/storage";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [filePath, setFilePath] = useState<string>("");

  async function handleSubmit() {
    try {
      setIsLoading(true);

      if (!filePath) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Por favor selecciona un archivo JSON",
        });
        return;
      }

      // Leer el archivo JSON
      const content = fs.readFileSync(path.resolve(filePath), "utf-8");

      // Parsear los códigos OTP
      const otpConfigs = parseOTPFromJSON(content);

      if (otpConfigs.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "No se encontraron códigos OTP válidos en el archivo",
        });
        return;
      }

      // Cargar las configuraciones existentes
      const existingConfigs = await loadOTPConfigs();

      // Combinar con las nuevas configuraciones
      const updatedConfigs = [...existingConfigs, ...otpConfigs];

      // Guardar las configuraciones actualizadas
      await saveOTPConfigs(updatedConfigs);

      showToast({
        style: Toast.Style.Success,
        title: "Éxito",
        message: `Se importaron ${otpConfigs.length} códigos OTP`,
      });

      // Volver a la vista principal
      popToRoot();
    } catch (error) {
      console.error("Error al importar códigos OTP:", error);

      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Ocurrió un error al importar los códigos OTP",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Importar" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="Archivo JSON"
        allowMultipleSelection={false}
        onChange={(files) => setFilePath(files[0])}
      />
      <Form.Description
        title="Formato esperado"
        text="El archivo debe contener un array de strings con URLs de OTP en formato 'otpauth://totp/...'"
      />
      <Form.Description
        title="Ejemplo"
        text='[
  "otpauth://totp/NombreServicio?secret=ABC123&algorithm=SHA1&digits=7&period=10",
  "otpauth://totp/NombreServicio2?secret=XYZ890&algorithm=SHA1&digits=7&period=30&issuer=UnoDos"
]'
      />
    </Form>
  );
}
