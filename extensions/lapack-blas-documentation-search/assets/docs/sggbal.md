```fortran
subroutine sggbal (
        character job,
        integer n,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( ldb, * ) b,
        integer ldb,
        integer ilo,
        integer ihi,
        real, dimension( * ) lscale,
        real, dimension( * ) rscale,
        real, dimension( * ) work,
        integer info
)
```

SGGBAL balances a pair of general real matrices (A,B).  This
involves, first, permuting A and B by similarity transformations to
isolate eigenvalues in the first 1 to ILO$-$1 and last IHI+1 to N
elements on the diagonal; and second, applying a diagonal similarity
transformation to rows and columns ILO to IHI to make the rows
and columns as close in norm as possible. Both steps are optional.

Balancing may reduce the 1-norm of the matrices, and improve the
accuracy of the computed eigenvalues and/or eigenvectors in the
generalized eigenvalue problem A\*x = lambda\*B\*x.

## Parameters
JOB : CHARACTER\*1 [in]
> Specifies the operations to be performed on A and B:
> = 'N':  none:  simply set ILO = 1, IHI = N, LSCALE(I) = 1.0
> and RSCALE(I) = 1.0 for i = 1,...,N.
> = 'P':  permute only;
> = 'S':  scale only;
> = 'B':  both permute and scale.

N : INTEGER [in]
> The order of the matrices A and B.  N >= 0.

A : REAL array, dimension (LDA,N) [in,out]
> On entry, the input matrix A.
> On exit,  A is overwritten by the balanced matrix.
> If JOB = 'N', A is not referenced.

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >= max(1,N).

B : REAL array, dimension (LDB,N) [in,out]
> On entry, the input matrix B.
> On exit,  B is overwritten by the balanced matrix.
> If JOB = 'N', B is not referenced.

LDB : INTEGER [in]
> The leading dimension of the array B. LDB >= max(1,N).

ILO : INTEGER [out]

IHI : INTEGER [out]
> ILO and IHI are set to integers such that on exit
> A(i,j) = 0 and B(i,j) = 0 if i > j and
> j = 1,...,ILO-1 or i = IHI+1,...,N.
> If JOB = 'N' or 'S', ILO = 1 and IHI = N.

LSCALE : REAL array, dimension (N) [out]
> Details of the permutations and scaling factors applied
> to the left side of A and B.  If P(j) is the index of the
> row interchanged with row j, and D(j)
> is the scaling factor applied to row j, then
> LSCALE(j) = P(j)    for J = 1,...,ILO-1
> = D(j)    for J = ILO,...,IHI
> = P(j)    for J = IHI+1,...,N.
> The order in which the interchanges are made is N to IHI+1,
> then 1 to ILO-1.

RSCALE : REAL array, dimension (N) [out]
> Details of the permutations and scaling factors applied
> to the right side of A and B.  If P(j) is the index of the
> column interchanged with column j, and D(j)
> is the scaling factor applied to column j, then
> LSCALE(j) = P(j)    for J = 1,...,ILO-1
> = D(j)    for J = ILO,...,IHI
> = P(j)    for J = IHI+1,...,N.
> The order in which the interchanges are made is N to IHI+1,
> then 1 to ILO-1.

WORK : REAL array, dimension (lwork) [out]
> lwork must be at least max(1,6\*N) when JOB = 'S' or 'B', and
> at least 1 when JOB = 'N' or 'P'.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value.
