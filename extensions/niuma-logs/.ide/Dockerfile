FROM cnbcool/default-dev-env:latest
ARG NODE_VERSION=22

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

ENV NVM_DIR=/root/.nvm

RUN bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION"

RUN apt-get update && \
    apt-get install -y xdg-utils

ENTRYPOINT ["zsh", "-c", "source $NVM_DIR/nvm.sh && exec \"$@\"", "--"]
CMD ["/bin/zsh"]
