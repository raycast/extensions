```fortran
double precision function dla_gercond (
        character trans,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( ldaf, * ) af,
        integer ldaf,
        integer, dimension( * ) ipiv,
        integer cmode,
        double precision, dimension( * ) c,
        integer info,
        double precision, dimension( * ) work,
        integer, dimension( * ) iwork
)
```

DLA_GERCOND estimates the Skeel condition number of op(A) \* op2(C)
where op2 is determined by CMODE as follows
CMODE =  1    op2(C) = C
CMODE =  0    op2(C) = I
CMODE = -1    op2(C) = inv(C)
The Skeel condition number cond(A) = norminf( |inv(A)||A| )
is computed by computing scaling factors R such that
diag(R)\*A\*op2(C) is row equilibrated and computing the standard
infinity-norm condition number.

## Parameters
TRANS : CHARACTER\*1 [in]
> Specifies the form of the system of equations:
> = 'N':  A \* X = B     (No transpose)
> = 'T':  A\*\*T \* X = B  (Transpose)
> = 'C':  A\*\*H \* X = B  (Conjugate Transpose = Transpose)

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in]
> On entry, the N-by-N matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

AF : DOUBLE PRECISION array, dimension (LDAF,N) [in]
> The factors L and U from the factorization
> A = P\*L\*U as computed by DGETRF.

LDAF : INTEGER [in]
> The leading dimension of the array AF.  LDAF >= max(1,N).

IPIV : INTEGER array, dimension (N) [in]
> The pivot indices from the factorization A = P\*L\*U
> as computed by DGETRF; row i of the matrix was interchanged
> with row IPIV(i).

CMODE : INTEGER [in]
> Determines op2(C) in the formula op(A) \* op2(C) as follows:
> CMODE =  1    op2(C) = C
> CMODE =  0    op2(C) = I
> CMODE = -1    op2(C) = inv(C)

C : DOUBLE PRECISION array, dimension (N) [in]
> The vector C in the formula op(A) \* op2(C).

INFO : INTEGER [out]
> = 0:  Successful exit.
> i > 0:  The ith argument is invalid.

WORK : DOUBLE PRECISION array, dimension (3\*N). [out]
> Workspace.

IWORK : INTEGER array, dimension (N). [out]
> Workspace.
