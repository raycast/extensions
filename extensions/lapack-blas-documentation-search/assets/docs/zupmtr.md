```fortran
subroutine zupmtr (
        character side,
        character uplo,
        character trans,
        integer m,
        integer n,
        complex*16, dimension( * ) ap,
        complex*16, dimension( * ) tau,
        complex*16, dimension( ldc, * ) c,
        integer ldc,
        complex*16, dimension( * ) work,
        integer info
)
```

ZUPMTR overwrites the general complex M-by-N matrix C with

SIDE = 'L'     SIDE = 'R'
TRANS = 'N':      Q \* C          C \* Q
TRANS = 'C':      Q\*\*H \* C       C \* Q\*\*H

where Q is a complex unitary matrix of order nq, with nq = m if
SIDE = 'L' and nq = n if SIDE = 'R'. Q is defined as the product of
nq-1 elementary reflectors, as returned by ZHPTRD using packed
storage:

if UPLO = 'U', Q = H(nq-1) . . . H(2) H(1);

if UPLO = 'L', Q = H(1) H(2) . . . H(nq-1).

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'L': apply Q or Q\*\*H from the Left;
> = 'R': apply Q or Q\*\*H from the Right.

UPLO : CHARACTER\*1 [in]
> = 'U': Upper triangular packed storage used in previous
> call to ZHPTRD;
> = 'L': Lower triangular packed storage used in previous
> call to ZHPTRD.

TRANS : CHARACTER\*1 [in]
> = 'N':  No transpose, apply Q;
> = 'C':  Conjugate transpose, apply Q\*\*H.

M : INTEGER [in]
> The number of rows of the matrix C. M >= 0.

N : INTEGER [in]
> The number of columns of the matrix C. N >= 0.

AP : COMPLEX\*16 array, dimension [in]
> (M\*(M+1)/2) if SIDE = 'L'
> (N\*(N+1)/2) if SIDE = 'R'
> The vectors which define the elementary reflectors, as
> returned by ZHPTRD.  AP is modified by the routine but
> restored on exit.

TAU : COMPLEX\*16 array, dimension (M-1) if SIDE = 'L' [in]
> or (N-1) if SIDE = 'R'
> TAU(i) must contain the scalar factor of the elementary
> reflector H(i), as returned by ZHPTRD.

C : COMPLEX\*16 array, dimension (LDC,N) [in,out]
> On entry, the M-by-N matrix C.
> On exit, C is overwritten by Q\*C or Q\*\*H\*C or C\*Q\*\*H or C\*Q.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1,M).

WORK : COMPLEX\*16 array, dimension [out]
> (N) if SIDE = 'L'
> (M) if SIDE = 'R'

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
