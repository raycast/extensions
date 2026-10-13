import bruto from "../dados/lexico.json";
import { Nivel, Verbete } from "./tipos";
import { semAcento } from "./texto";

const TODOS: Verbete[] = (bruto.palavras as Verbete[]).map((v) => ({ ...v, nivel: v.nivel as Nivel }));

export function todosOsVerbetes(): Verbete[] {
  return TODOS;
}

export function verbetesDoNivel(nivel: "todos" | "1" | "2" | "3"): Verbete[] {
  if (nivel === "todos") return TODOS;
  const alvo = Number(nivel) as Nivel;
  return TODOS.filter((v) => v.nivel === alvo);
}

export function acharVerbete(palavra: string): Verbete | undefined {
  const chave = semAcento(palavra).toLocaleLowerCase("pt-BR");
  return TODOS.find((v) => semAcento(v.palavra).toLocaleLowerCase("pt-BR") === chave);
}

export const ROTULO_NIVEL: Record<Nivel, string> = {
  1: "Cotidiano",
  2: "Culto",
  3: "Erudito",
};
