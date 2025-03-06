import { Form, ActionPanel, Action, showToast, Toast, popToRoot } from "@raycast/api";
import React, { useState } from "react";
import { addOTPConfig } from "../utils/storage";
import { parseOTPAuthURL } from "../utils/parser";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [secretError, setSecretError] = useState<string | undefined>();

  async function handleSubmit(values: {
    name: string;
    issuer?: string;
    secret: string;
    algorithm: "SHA1" | "SHA256" | "SHA512";
    digits: string;
    period: string;
  }) {
    try {
      setIsLoading(true);

      if (!values.name) {
        setNameError("El nombre es obligatorio");
        return;
      }

      if (!values.secret) {
        setSecretError("El secreto es obligatorio");
        return;
      }

      // Construir la URL OTP
      const otpUrl = `otpauth://totp/${encodeURIComponent(values.name)}?secret=${
        values.secret
      }&algorithm=${values.algorithm}&digits=${values.digits}&period=${
        values.period
      }${values.issuer ? `&issuer=${encodeURIComponent(values.issuer)}` : ""}`;

      // Parsear la URL para validar
      const config = parseOTPAuthURL(otpUrl);

      if (!config) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Datos de OTP inválidos",
        });
        return;
      }

      // Guardar la configuración
      await addOTPConfig(config);

      showToast({
        style: Toast.Style.Success,
        title: "Éxito",
        message: "Código OTP agregado correctamente",
      });

      // Volver a la vista principal
      popToRoot();
    } catch (error) {
      console.error("Error al agregar código OTP:", error);

      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Ocurrió un error al agregar el código OTP",
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
          <Action.SubmitForm title="Agregar" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Nombre"
        placeholder="Nombre del servicio"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="issuer"
        title="Proveedor (opcional)"
        placeholder="Empresa o servicio emisor"
      />
      <Form.TextField
        id="secret"
        title="Secreto"
        placeholder="Clave secreta (Base32)"
        error={secretError}
        onChange={() => setSecretError(undefined)}
      />
      <Form.Dropdown id="algorithm" title="Algoritmo" defaultValue="SHA1">
        <Form.Dropdown.Item value="SHA1" title="SHA1" />
        <Form.Dropdown.Item value="SHA256" title="SHA256" />
        <Form.Dropdown.Item value="SHA512" title="SHA512" />
      </Form.Dropdown>
      <Form.TextField
        id="digits"
        title="Dígitos"
        placeholder="Número de dígitos"
        defaultValue="6"
      />
      <Form.TextField
        id="period"
        title="Periodo (segundos)"
        placeholder="Duración del código"
        defaultValue="30"
      />
    </Form>
  );
}
