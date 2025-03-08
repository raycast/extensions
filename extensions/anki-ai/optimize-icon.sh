#!/bin/bash

# Caminho para o ícone original
ORIGINAL_ICON="./assets/anki-icon-512.png"

# Verificar se o ícone original existe
if [ ! -f "$ORIGINAL_ICON" ]; then
  echo "Erro: Ícone original não encontrado em $ORIGINAL_ICON"
  exit 1
fi

# Criar ícone otimizado para Raycast
echo "Criando ícone otimizado para Raycast..."
sips -s format png -z 512 512 "$ORIGINAL_ICON" --out ./raycast-icon.png

# Verificar se o ícone foi criado com sucesso
if [ ! -f "./raycast-icon.png" ]; then
  echo "Erro: Falha ao criar o ícone otimizado"
  exit 1
fi

echo "Ícone otimizado criado com sucesso: raycast-icon.png"
echo "Dimensões do ícone:"
sips -g pixelWidth -g pixelHeight ./raycast-icon.png

echo "Atualizando package.json para usar o novo ícone..."
# Você precisará atualizar manualmente o package.json para usar "raycast-icon.png"

echo "Concluído! Agora execute 'npm run build' para reconstruir a extensão."
