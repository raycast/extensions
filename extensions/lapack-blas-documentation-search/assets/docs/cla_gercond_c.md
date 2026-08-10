```fortran
real function cla_gercond_c (
        character trans,
        integer n,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( ldaf, * ) af,
        integer ldaf,
        integer, dimension( * ) ipiv,
        real, dimension( * ) c,
        logical capply,
        integer info,
        complex, dimension( * ) work,
        real, dimension( * ) rwork
)
```

CLA_GERCOND_C computes the infinity norm condition number of
op(A) \* inv(diag(C)) where C is a REAL vector.

## Parameters
TRANS : CHARACTER\*1 [in]
> Specifies the form of the system of equations:
> = 'N':  A \* X = B     (No transpose)
> = 'T':  A\*\*T \* X = B  (Transpose)
> = 'C':  A\*\*H \* X = B  (Conjugate Transpose = Transpose)

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

A : COMPLEX array, dimension (LDA,N) [in]
> On entry, the N-by-N matrix A

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

AF : COMPLEX array, dimension (LDAF,N) [in]
> The factors L and U from the factorization
> A = P\*L\*U as computed by CGETRF.

LDAF : INTEGER [in]
> The leading dimension of the array AF.  LDAF >= max(1,N).

IPIV : INTEGER array, dimension (N) [in]
> The pivot indices from the factorization A = P\*L\*U
> as computed by CGETRF; row i of the matrix was interchanged
> with row IPIV(i).

C : REAL array, dimension (N) [in]
> The vector C in the formula op(A) \* inv(diag(C)).

CAPPLY : LOGICAL [in]
> If .TRUE. then access the vector C in the formula above.

INFO : INTEGER [out]
> = 0:  Successful exit.
> i > 0:  The ith argument is invalid.

WORK : COMPLEX array, dimension (2\*N). [out]
> Workspace.

RWORK : REAL array, dimension (N). [out]
> Workspace.
