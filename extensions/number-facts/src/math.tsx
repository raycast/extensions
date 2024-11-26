import { useState } from "react";
import SharedForm from "./shared/shared-form";

const MathFacts = () => {
  const [number, setNumber] = useState("");
  const apiUrl = `http://numbersapi.com/${number || "random"}/math`;

  return <SharedForm apiUrl={apiUrl} inputType="number" number={number} setNumber={setNumber} allowNegative={false} />;
};

export default MathFacts;
