/**
 * Ponto de entrada do comando `ask-hermes` do manifest.
 *
 * O Raycast resolve cada comando pelo arquivo `src/<name>.tsx`, e o `name` fixado pela
 * UX-SPEC §1.1 é `ask-hermes`. A implementação da tela mora em `./ask`, então este arquivo
 * existe só para casar o nome do manifest com ela — sem lógica, para não haver dois lugares
 * onde a tela principal possa divergir.
 */

export { default } from "./ask";
