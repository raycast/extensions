```fortran
subroutine ssycon_rook (
        character uplo,
        integer n,
        real, dimension( lda, * ) a,
        integer lda,
        integer, dimension( * ) ipiv,
        real anorm,
        real rcond,
        real, dimension( * ) work,
        integer, dimension( * ) iwork,
        integer info
)
```

SSYCON_ROOK estimates the reciprocal of the condition number (in the
1-norm) of a real symmetric matrix A using the factorization
A = U\*D\*U\*\*T or A = L\*D\*L\*\*T computed by SSYTRF_ROOK.

An estimate is obtained for norm(inv(A)), and the reciprocal of the
condition number is computed as RCOND = 1 / (ANORM \* norm(inv(A))).

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the details of the factorization are stored
> as an upper or lower triangular matrix.
> = 'U':  Upper triangular, form is A = U\*D\*U\*\*T;
> = 'L':  Lower triangular, form is A = L\*D\*L\*\*T.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : REAL array, dimension (LDA,N) [in]
> The block diagonal matrix D and the multipliers used to
> obtain the factor U or L as computed by SSYTRF_ROOK.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

IPIV : INTEGER array, dimension (N) [in]
> Details of the interchanges and the block structure of D
> as determined by SSYTRF_ROOK.

ANORM : REAL [in]
> The 1-norm of the original matrix A.

RCOND : REAL [out]
> The reciprocal of the condition number of the matrix A,
> computed as RCOND = 1/(ANORM \* AINVNM), where AINVNM is an
> estimate of the 1-norm of inv(A) computed in this routine.

WORK : REAL array, dimension (2\*N) [out]

IWORK : INTEGER array, dimension (N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
