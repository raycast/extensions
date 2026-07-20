```fortran
subroutine ssbgst (
        character vect,
        character uplo,
        integer n,
        integer ka,
        integer kb,
        real, dimension( ldab, * ) ab,
        integer ldab,
        real, dimension( ldbb, * ) bb,
        integer ldbb,
        real, dimension( ldx, * ) x,
        integer ldx,
        real, dimension( * ) work,
        integer info
)
```

SSBGST reduces a real symmetric-definite banded generalized
eigenproblem  A\*x = lambda\*B\*x  to standard form  C\*y = lambda\*y,
such that C has the same bandwidth as A.

B must have been previously factorized as S\*\*T\*S by SPBSTF, using a
split Cholesky factorization. A is overwritten by C = X\*\*T\*A\*X, where
X = S\*\*(-1)\*Q and Q is an orthogonal matrix chosen to preserve the
bandwidth of A.

## Parameters
VECT : CHARACTER\*1 [in]
> = 'N':  do not form the transformation matrix X;
> = 'V':  form X.

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrices A and B.  N >= 0.

KA : INTEGER [in]
> The number of superdiagonals of the matrix A if UPLO = 'U',
> or the number of subdiagonals if UPLO = 'L'.  KA >= 0.

KB : INTEGER [in]
> The number of superdiagonals of the matrix B if UPLO = 'U',
> or the number of subdiagonals if UPLO = 'L'.  KA >= KB >= 0.

AB : REAL array, dimension (LDAB,N) [in,out]
> On entry, the upper or lower triangle of the symmetric band
> matrix A, stored in the first ka+1 rows of the array.  The
> j-th column of A is stored in the j-th column of the array AB
> as follows:
> if UPLO = 'U', AB(ka+1+i-j,j) = A(i,j) for max(1,j-ka)<=i<=j;
> if UPLO = 'L', AB(1+i-j,j)    = A(i,j) for j<=i<=min(n,j+ka).
> 
> On exit, the transformed matrix X\*\*T\*A\*X, stored in the same
> format as A.

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= KA+1.

BB : REAL array, dimension (LDBB,N) [in]
> The banded factor S from the split Cholesky factorization of
> B, as returned by SPBSTF, stored in the first KB+1 rows of
> the array.

LDBB : INTEGER [in]
> The leading dimension of the array BB.  LDBB >= KB+1.

X : REAL array, dimension (LDX,N) [out]
> If VECT = 'V', the n-by-n matrix X.
> If VECT = 'N', the array X is not referenced.

LDX : INTEGER [in]
> The leading dimension of the array X.
> LDX >= max(1,N) if VECT = 'V'; LDX >= 1 otherwise.

WORK : REAL array, dimension (2\*N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value.
