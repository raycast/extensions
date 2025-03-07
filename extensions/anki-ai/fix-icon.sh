#!/bin/bash

# Definir cores para mensagens
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Iniciando script de correção de ícone para Raycast...${NC}"

# Verificar se o ícone original existe
ORIGINAL_ICON="./assets/anki-icon-512.png"
if [ ! -f "$ORIGINAL_ICON" ]; then
  echo -e "${RED}Erro: Ícone original não encontrado em $ORIGINAL_ICON${NC}"
  exit 1
fi

# Criar diretório para ícones se não existir
mkdir -p ./assets

# Criar ícone principal (512x512)
echo -e "${BLUE}Criando ícone principal (512x512)...${NC}"
sips -s format png -z 512 512 "$ORIGINAL_ICON" --out ./icon.png

# Criar ícone para tema escuro
echo -e "${BLUE}Criando ícone para tema escuro...${NC}"
cp ./icon.png ./icon@dark.png

# Criar ícones em vários locais para garantir compatibilidade
echo -e "${BLUE}Criando cópias do ícone em locais estratégicos...${NC}"
cp ./icon.png ./assets/icon.png
cp ./icon@dark.png ./assets/icon@dark.png

# Criar ícone para comando específico
mkdir -p ./commands/generateFlashcard.raycast
cp ./icon.png ./commands/generateFlashcard.raycast/icon.png
cp ./icon@dark.png ./commands/generateFlashcard.raycast/icon@dark.png

# Atualizar package.json
echo -e "${BLUE}Atualizando package.json...${NC}"
sed -i '' 's/"icon": ".*"/"icon": "icon.png"/g' package.json

# Verificar tamanho e formato do ícone
echo -e "${GREEN}Verificando ícones criados:${NC}"
file ./icon.png
sips -g pixelWidth -g pixelHeight ./icon.png

echo -e "${GREEN}Concluído! Agora execute 'npm run build' para reconstruir a extensão.${NC}"
