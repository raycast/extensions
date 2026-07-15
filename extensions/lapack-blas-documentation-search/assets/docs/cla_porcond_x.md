```fortran
real function cla_porcond_x (
        character uplo,
        integer n,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( ldaf, * ) af,
        integer ldaf,
        complex, dimension( * ) x,
        integer info,
        complex, dimension( * ) work,
        real, dimension( * ) rwork
)
```

CLA_PORCOND_X Computes the infinity norm condition number of
op(A) \* diag(X) where X is a COMPLEX vector.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

A : COMPLEX array, dimension (LDA,N) [in]
> On entry, the N-by-N matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

AF : COMPLEX array, dimension (LDAF,N) [in]
> The triangular factor U or L from the Cholesky factorization
> A = U\*\*H\*U or A = L\*L\*\*H, as computed by CPOTRF.

LDAF : INTEGER [in]
> The leading dimension of the array AF.  LDAF >= max(1,N).

X : COMPLEX array, dimension (N) [in]
> The vector X in the formula op(A) \* diag(X).

INFO : INTEGER [out]
> = 0:  Successful exit.
> i > 0:  The ith argument is invalid.

WORK : COMPLEX array, dimension (2\*N). [out]
> Workspace.

RWORK : REAL array, dimension (N). [out]
> Workspace.
