import { useState, useEffect } from "react";
import { generateOTP, getRemainingSeconds } from "../utils/otpGenerator";
import { OTPConfig } from "../types";

export function useOTP(config: OTPConfig) {
  const [code, setCode] = useState("");
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    // Función para actualizar el código y el tiempo restante
    const updateCode = () => {
      setCode(generateOTP(config));
      setRemaining(getRemainingSeconds(config.period));
    };

    // Actualizar inmediatamente
    updateCode();

    // Configurar un intervalo para actualizar cada segundo
    const interval = setInterval(() => {
      const newRemaining = getRemainingSeconds(config.period);

      // Si cambia a un nuevo periodo, generar un nuevo código
      if (newRemaining === config.period) {
        updateCode();
      } else {
        setRemaining(newRemaining);
      }
    }, 1000);

    // Limpiar el intervalo al desmontar
    return () => clearInterval(interval);
  }, [config]);

  return { code, remaining };
}
