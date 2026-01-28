```fortran
subroutine cgecon (
        character norm,
        integer n,
        complex, dimension( lda, * ) a,
        integer lda,
        real anorm,
        real rcond,
        complex, dimension( * ) work,
        real, dimension( * ) rwork,
        integer info
)
```

CGECON estimates the reciprocal of the condition number of a general
complex matrix A, in either the 1-norm or the infinity-norm, using
the LU factorization computed by CGETRF.

An estimate is obtained for norm(inv(A)), and the reciprocal of the
condition number is computed as
RCOND = 1 / ( norm(A) \* norm(inv(A)) ).

## Parameters
NORM : CHARACTER\*1 [in]
> Specifies whether the 1-norm condition number or the
> infinity-norm condition number is required:
> = '1' or 'O':  1-norm;
> = 'I':         Infinity-norm.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : COMPLEX array, dimension (LDA,N) [in]
> The factors L and U from the factorization A = P\*L\*U
> as computed by CGETRF.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

ANORM : REAL [in]
> If NORM = '1' or 'O', the 1-norm of the original matrix A.
> If NORM = 'I', the infinity-norm of the original matrix A.

RCOND : REAL [out]
> The reciprocal of the condition number of the matrix A,
> computed as RCOND = 1/(norm(A) \* norm(inv(A))).

WORK : COMPLEX array, dimension (2\*N) [out]

RWORK : REAL array, dimension (2\*N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> NaNs are illegal values for ANORM, and they propagate to
> the output parameter RCOND.
> Infinity is illegal for ANORM, and it propagates to the output
> parameter RCOND as 0.
> = 1:  if RCOND = NaN, or
> RCOND = Inf, or
> the computed norm of the inverse of A is 0.
> In the latter, RCOND = 0 is returned.
