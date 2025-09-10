#!/bin/bash

echo "🚀 Instalando extensão Node Play para Raycast..."

if ! command -v ray &> /dev/null; then
    echo "❌ Raycast CLI não encontrado. Por favor, instale o Raycast CLI primeiro."
    echo "   Visite: https://raycast.com"
    exit 1
fi

echo "📦 Instalando dependências..."
npm install

echo "🔨 Compilando extensão..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Extensão compilada com sucesso!"
    echo ""
    echo "📋 Para instalar a extensão no Raycast:"
    echo "   1. Abra o Raycast"
    echo "   2. Vá em Extensions > Import Extension"
    echo "   3. Selecione esta pasta: $(pwd)"
    echo ""
    echo "🎉 Instalação concluída! Use 'Node Play' no Raycast para começar."
else
    echo "❌ Erro na compilação. Verifique os logs acima."
    exit 1
fi
