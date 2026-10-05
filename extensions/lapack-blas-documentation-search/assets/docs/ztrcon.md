```fortran
subroutine ztrcon (
        character norm,
        character uplo,
        character diag,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        double precision rcond,
        complex*16, dimension( * ) work,
        double precision, dimension( * ) rwork,
        integer info
)
```

ZTRCON estimates the reciprocal of the condition number of a
triangular matrix A, in either the 1-norm or the infinity-norm.

The norm of A is computed and an estimate is obtained for
norm(inv(A)), then the reciprocal of the condition number is
computed as
RCOND = 1 / ( norm(A) \* norm(inv(A)) ).

## Parameters
NORM : CHARACTER\*1 [in]
> Specifies whether the 1-norm condition number or the
> infinity-norm condition number is required:
> = '1' or 'O':  1-norm;
> = 'I':         Infinity-norm.

UPLO : CHARACTER\*1 [in]
> = 'U':  A is upper triangular;
> = 'L':  A is lower triangular.

DIAG : CHARACTER\*1 [in]
> = 'N':  A is non-unit triangular;
> = 'U':  A is unit triangular.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in]
> The triangular matrix A.  If UPLO = 'U', the leading N-by-N
> upper triangular part of the array A contains the upper
> triangular matrix, and the strictly lower triangular part of
> A is not referenced.  If UPLO = 'L', the leading N-by-N lower
> triangular part of the array A contains the lower triangular
> matrix, and the strictly upper triangular part of A is not
> referenced.  If DIAG = 'U', the diagonal elements of A are
> also not referenced and are assumed to be 1.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

RCOND : DOUBLE PRECISION [out]
> The reciprocal of the condition number of the matrix A,
> computed as RCOND = 1/(norm(A) \* norm(inv(A))).

WORK : COMPLEX\*16 array, dimension (2\*N) [out]

RWORK : DOUBLE PRECISION array, dimension (N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
