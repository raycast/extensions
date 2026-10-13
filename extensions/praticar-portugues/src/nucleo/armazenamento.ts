import { LocalStorage } from "@raycast/api";
import { Progresso, Recordes, Sessao } from "./tipos";

const CHAVE_PROGRESSO = "progresso.v1";
const CHAVE_SESSOES = "sessoes.v1";
const CHAVE_RECORDES = "recordes.v1";

/** Quantas sessões guardamos. O suficiente para meses de gráfico, sem inchar o storage. */
const LIMITE_SESSOES = 200;

export const RECORDES_ZERADOS: Recordes = {
  melhorPpm: 0,
  melhorPrecisao: 0,
  sequenciaDias: 0,
  melhorSequenciaDias: 0,
  ultimoDia: "",
};

async function lerJson<T>(chave: string, padrao: T): Promise<T> {
  const cru = await LocalStorage.getItem<string>(chave);
  if (!cru) return padrao;
  try {
    return JSON.parse(cru) as T;
  } catch {
    // Storage corrompido não pode derrubar o comando: recomeça do padrão.
    await LocalStorage.removeItem(chave);
    return padrao;
  }
}

export async function lerProgresso(): Promise<Progresso> {
  return lerJson<Progresso>(CHAVE_PROGRESSO, {});
}

export async function gravarProgresso(progresso: Progresso): Promise<void> {
  await LocalStorage.setItem(CHAVE_PROGRESSO, JSON.stringify(progresso));
}

export async function lerSessoes(): Promise<Sessao[]> {
  return lerJson<Sessao[]>(CHAVE_SESSOES, []);
}

export async function acrescentarSessao(sessao: Sessao): Promise<Sessao[]> {
  const anteriores = await lerSessoes();
  const atualizadas = [...anteriores, sessao].slice(-LIMITE_SESSOES);
  await LocalStorage.setItem(CHAVE_SESSOES, JSON.stringify(atualizadas));
  return atualizadas;
}

export async function lerRecordes(): Promise<Recordes> {
  return lerJson<Recordes>(CHAVE_RECORDES, RECORDES_ZERADOS);
}

export async function gravarRecordes(recordes: Recordes): Promise<void> {
  await LocalStorage.setItem(CHAVE_RECORDES, JSON.stringify(recordes));
}

export async function zerarTudo(): Promise<void> {
  await Promise.all([
    LocalStorage.removeItem(CHAVE_PROGRESSO),
    LocalStorage.removeItem(CHAVE_SESSOES),
    LocalStorage.removeItem(CHAVE_RECORDES),
  ]);
}
