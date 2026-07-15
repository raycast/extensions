```fortran
subroutine sopmtr (
        character side,
        character uplo,
        character trans,
        integer m,
        integer n,
        real, dimension( * ) ap,
        real, dimension( * ) tau,
        real, dimension( ldc, * ) c,
        integer ldc,
        real, dimension( * ) work,
        integer info
)
```

SOPMTR overwrites the general real M-by-N matrix C with

SIDE = 'L'     SIDE = 'R'
TRANS = 'N':      Q \* C          C \* Q
TRANS = 'T':      Q\*\*T \* C       C \* Q\*\*T

where Q is a real orthogonal matrix of order nq, with nq = m if
SIDE = 'L' and nq = n if SIDE = 'R'. Q is defined as the product of
nq-1 elementary reflectors, as returned by SSPTRD using packed
storage:

if UPLO = 'U', Q = H(nq-1) . . . H(2) H(1);

if UPLO = 'L', Q = H(1) H(2) . . . H(nq-1).

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'L': apply Q or Q\*\*T from the Left;
> = 'R': apply Q or Q\*\*T from the Right.

UPLO : CHARACTER\*1 [in]
> = 'U': Upper triangular packed storage used in previous
> call to SSPTRD;
> = 'L': Lower triangular packed storage used in previous
> call to SSPTRD.

TRANS : CHARACTER\*1 [in]
> = 'N':  No transpose, apply Q;
> = 'T':  Transpose, apply Q\*\*T.

M : INTEGER [in]
> The number of rows of the matrix C. M >= 0.

N : INTEGER [in]
> The number of columns of the matrix C. N >= 0.

AP : REAL array, dimension [in]
> (M\*(M+1)/2) if SIDE = 'L'
> (N\*(N+1)/2) if SIDE = 'R'
> The vectors which define the elementary reflectors, as
> returned by SSPTRD.  AP is modified by the routine but
> restored on exit.

TAU : REAL array, dimension (M-1) if SIDE = 'L' [in]
> or (N-1) if SIDE = 'R'
> TAU(i) must contain the scalar factor of the elementary
> reflector H(i), as returned by SSPTRD.

C : REAL array, dimension (LDC,N) [in,out]
> On entry, the M-by-N matrix C.
> On exit, C is overwritten by Q\*C or Q\*\*T\*C or C\*Q\*\*T or C\*Q.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1,M).

WORK : REAL array, dimension [out]
> (N) if SIDE = 'L'
> (M) if SIDE = 'R'

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
